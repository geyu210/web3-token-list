import CeloTokens from "./build/42220-tokens.json";
import CeloFreshTokens from "./build/42220-fresh-tokens.json";
import BaseTokens from "./build/8453-tokens.json";
import BaseFreshTokens from "./build/8453-fresh-tokens.json";

export type Token = {
    chainId: number;
    address: string;
    decimals: number;
    name: string;
    symbol: string;
    logoURI?: string;
};

export const TOKEN_LIST: Record<number | string, Token[]> = {
    // celo
    42220: CeloTokens,
    celo: CeloTokens,
    // base
    8453: BaseTokens,
    base: BaseTokens,
};

export const FRESH_TOKEN_LIST: Record<number | string, Token[]> = {
    // celo
    42220: CeloFreshTokens,
    celo: CeloFreshTokens,
    // base
    8453: BaseFreshTokens,
    base: BaseFreshTokens,
}

export default TOKEN_LIST;
