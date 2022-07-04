const fs = require("fs")
const axios = require('axios').default
const utils = require('web3-utils')
const { createAlchemyWeb3 } = require('@alch/alchemy-web3')
const Promise = require('bluebird')
const ERC20 = require('./erc20.json')

const TOKEN_LIST = {
    // celo
    42220: [
        'https://raw.githubusercontent.com/sushiswap/default-token-list/master/tokens/celo.json',
        'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap.token-list.json',
        'https://raw.githubusercontent.com/Ubeswap/default-token-list/master/ubeswap-experimental.token-list.json',
        'https://raw.githubusercontent.com/centfinance/Symmetric.WebInterface-v2/symmetric-v2/src/data/listed.tokenlist.json',
    ],

}
const RPC_URL = {
    // celo
    42220: 'https://rpc.ankr.com/celo',
    // gnosis
    100: 'https://rpc.ankr.com/gnosis',
    // polygon
    137: 'https://rpc.ankr.com/polygon',
    // avalanche
    43114: 'https://rpc.ankr.com/avalanche',
    // optimism
    10: 'https://rpc.ankr.com/optimism'
}

async function generate(chainId) {
    const tokenListUrls = TOKEN_LIST[chainId]
    console.log(`tokenListUrls = ${tokenListUrls}`)
    if (!tokenListUrls) {
        return
    }
    let additions = []
    try {
        additions = require(`./additions/${chainId}`)
        console.log(`additions = ${additions}`)
    } catch (err) {
        // ignore missing additions
    }


    const combined = []

    return combined
}

generate(42220)