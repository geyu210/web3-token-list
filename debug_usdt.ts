import { createPublicClient, http, parseAbiItem, getAddress } from 'viem';
import { celo } from 'viem/chains';

const TransferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const usdtAddress = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';

async function debug() {
    const client = createPublicClient({
        chain: celo,
        transport: http()
    });

    const latestBlock = await client.getBlockNumber();
    const lookBackBlocks = 10000n;
    const fromBlock = latestBlock - lookBackBlocks;

    console.log(`Checking logs for ${usdtAddress} from ${fromBlock} to ${latestBlock}`);

    try {
        const logs = await client.getLogs({
            address: getAddress(usdtAddress),
            event: TransferEvent,
            fromBlock,
            toBlock: latestBlock,
            strict: true,
        });
        console.log(`Found ${logs.length} logs`);
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
        console.error(JSON.stringify(e, null, 2));
    }
}

debug();
