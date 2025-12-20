//npx ts-node build.ts 8453 --rpc 
import 'dotenv/config';
import fs from 'fs';
import axios from 'axios';
import {
    createPublicClient,
    http,
    getAddress,
    type PublicClient,
    defineChain,
    parseAbiItem
} from 'viem';
import { base, celo } from 'viem/chains';

const TOKEN_LIST: Record<number, string[]> = {
    // celo
    42220: [
        'https://raw.githubusercontent.com/sushiswap/default-token-list/master/tokens/celo.json',
        'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap.token-list.json',
        'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap-experimental.token-list.json',
        'https://raw.githubusercontent.com/centfinance/Symmetric.WebInterface-v2/symmetric-v2/src/data/listed.tokenlist.json',
        'https://celo-org.github.io/celo-token-list/celo.tokenlist.json',
    ],
    // base
    8453: [
        'https://raw.githubusercontent.com/sushiswap/list/master/lists/token-lists/default-token-list/tokens/base.json',
        'https://raw.githubusercontent.com/ethereum-optimism/ethereum-optimism.github.io/master/optimism.tokenlist.json',
        // 'https://static.base.org/token-list.json', // broken
        'https://raw.githubusercontent.com/StabilityNexus/TokenList/main/base-tokens.json',
    ],
}

const CHAINS: Record<number, any> = {
    42220: celo,
    8453: base,
}

const TransferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

function validateToken(chainId: number, token: any) {
    if (!token.address || !token.decimals || !token.chainId || !token.symbol) {
        return false
    }
    return parseInt(token.chainId) === chainId
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function isTokenFresh(client: any, tokenAddress: `0x${string}`, latestBlock: bigint, lookBackBlocks: bigint, retryCount = 0): Promise<boolean> {
    try {
        const fromBlock = latestBlock - lookBackBlocks > 0n ? latestBlock - lookBackBlocks : 0n;
        const logs = await client.getLogs({
            address: tokenAddress,
            event: TransferEvent,
            fromBlock,
            toBlock: latestBlock,
            strict: true,
        });
        return logs.length > 0;
    } catch (e: any) {
        if (
            e.message.includes('limit exceeded') ||
            e.message.includes('too many results') ||
            e.message.includes('too large') ||
            e.message.includes('range')
        ) {
            return true;
        }

        // Network errors or rate limits - retry or assume fresh to be safe
        const msg = e.message.toLowerCase();
        if (
            msg.includes('took too long') ||
            msg.includes('timed out') ||
            msg.includes('503') ||
            msg.includes('429') ||
            msg.includes('network') ||
            msg.includes('disconnected') ||
            msg.includes('connection')
        ) {
            if (retryCount < 3) {
                const waitTime = (msg.includes('429') || msg.includes('503')) ? 5000 : 1000 * (retryCount + 1);
                await sleep(waitTime);
                return isTokenFresh(client, tokenAddress, latestBlock, lookBackBlocks, retryCount + 1);
            }
            console.warn(`Failed to check freshness for ${tokenAddress} after retries, assuming active: ${e.message}`);
            return true; // Fail open to avoid deleting valid tokens on RPC issues
        }

        return false;
    }
}

// filter for tokens that have had a transfer within recent blocks
async function filterFreshTokens(chainId: number, tokens: any[], rpcUrlOverride?: string, lookBackBlocks: bigint = 100000n) {
    const chain = CHAINS[chainId];
    if (!chain) return [];

    const defaultPublicRpc: Record<number, string> = {
        8453: 'https://mainnet.base.org',
        42220: 'https://forno.celo.org',
    };

    const rpcUrl = rpcUrlOverride || (chainId === 8453 ? process.env.BASE_RPC_URL : process.env.CELO_RPC_URL) || defaultPublicRpc[chainId];

    const client = createPublicClient({
        chain,
        transport: http(rpcUrl)
    });

    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - lookBackBlocks > 0n ? latestBlock - lookBackBlocks : 0n;

    console.info(`chain ${chainId} checking fresh tokens from block ${fromBlock} to ${latestBlock}...`);

    async function fetchLogs(start: bigint, end: bigint): Promise<any[]> {
        try {
            return await client.getLogs({
                event: TransferEvent,
                fromBlock: start,
                toBlock: end,
                strict: true,
            });
        } catch (e: any) {
            const msg = e.message.toLowerCase();
            if (msg.includes('range') || msg.includes('too large') || msg.includes('limit')) {
                // If range is too large, split in half and retry
                if (end - start > 100n) {
                    const mid = start + (end - start) / 2n;
                    console.info(`chain ${chainId} range too large, splitting: ${start}-${mid}, ${mid + 1n}-${end}`);
                    const [left, right] = await Promise.all([
                        fetchLogs(start, mid),
                        fetchLogs(mid + 1n, end)
                    ]);
                    return [...left, ...right];
                }
            }
            throw e;
        }
    }

    // For Base, fetching all logs is too heavy and often fails on public RPCs.
    // Skip directly to individual checks with batching.
    if (chainId !== 8453) {
        try {
            const logs = await fetchLogs(fromBlock, latestBlock);
            const activeAddresses = new Set(logs.map(log => getAddress(log.address)));
            return tokens.filter(token => activeAddresses.has(getAddress(token.address)));
        } catch (e: any) {
            console.warn(`chain ${chainId} failed to fetch logs even with splitting, falling back to individual checks: ${e.message}`);
        }
    } else {
        console.info(`chain ${chainId} skipping global log fetch, using batched individual checks.`);
    }

    // Batched individual checks
    const BATCH_SIZE = 50;
    const freshTokens: any[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        console.info(`Checking batch ${i} to ${i + batch.length} of ${tokens.length}`);

        await Promise.all(batch.map(async (token) => {
            const fresh = await isTokenFresh(client, token.address as `0x${string}`, latestBlock, chainId === 8453 ? 10000n : lookBackBlocks);
            if (fresh) {
                freshTokens.push(token);
            }
        }));
        await sleep(2000);
    }

    return freshTokens;
}

async function generate(chainId: number) {
    const tokenListUrls = TOKEN_LIST[chainId]
    if (!tokenListUrls) {
        return []
    }
    let additions: any[] = []
    try {
        additions = require(`./additions/${chainId}`)
    } catch (err) {
        // ignore missing additions
    }

    let removals: any[] = []
    try {
        removals = require(`./removals/${chainId}`)
    } catch (err) {
        // ignore missing removals
    }

    // remove duplicate tokens
    let seen: Record<string, any> = {}

    for (const tokenListUrl of tokenListUrls) {
        try {
            const response = await axios.get(tokenListUrl)
            let rawTokens = response.data
            if (Array.isArray(rawTokens)) {
                // token is already array, just append new ones in
            } else {
                rawTokens = rawTokens.tokens
            }

            for (const token of rawTokens) {
                if (!validateToken(chainId, token)) {
                    continue
                }
                token.address = getAddress(token.address)
                seen[token.address] = token
            }
            console.info(`chain ${chainId} fetched ${rawTokens.length} tokens from ${tokenListUrl}`)
        } catch (e) {
            console.error(`Failed to fetch from ${tokenListUrl}:`, (e as Error).message)
        }
    }

    for (const token of additions) {
        token.address = getAddress(token.address)
        seen[token.address] = token
    }

    for (const token of removals) {
        delete seen[getAddress(token.address)]
    }

    const combined = []
    for (const addr in seen) {
        const token = seen[addr]
        if (validateToken(chainId, token)) {
            combined.push(token)
        }
    }
    return combined
}

async function run(networkId?: string, rpcUrlOverride?: string) {
    for (const chainIdStr in TOKEN_LIST) {
        const chainId = parseInt(chainIdStr)
        if (networkId && chainId !== parseInt(networkId)) {
            console.info(`skipping chain ${chainId}`)
            continue
        }
        const tokens = await generate(chainId)

        const buildDir = './build';
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

        const outputFile = `${buildDir}/${chainId}-tokens.json`
        fs.writeFileSync(outputFile, JSON.stringify(tokens, null, 2))

        const freshTokens = await filterFreshTokens(chainId, tokens, rpcUrlOverride)
        fs.writeFileSync(`${buildDir}/${chainId}-fresh-tokens.json`, JSON.stringify(freshTokens, null, 2))

        console.info(`chain ${chainId}, ${tokens.length} tokens, ${freshTokens.length} are fresh, output ${outputFile}`)
    }
    process.exit(0)
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options: any = {};
    let networkId = undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                options[key] = args[i + 1];
                i++;
            } else {
                options[key] = true;
            }
        } else if (!networkId) {
            networkId = args[i];
        }
    }
    return { networkId, options };
}

const { networkId, options } = parseArgs();
run(networkId, options.rpc)
