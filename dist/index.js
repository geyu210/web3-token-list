"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRESH_TOKEN_LIST = exports.TOKEN_LIST = void 0;
const _42220_tokens_json_1 = __importDefault(require("./build/42220-tokens.json"));
const _42220_fresh_tokens_json_1 = __importDefault(require("./build/42220-fresh-tokens.json"));
const _8453_tokens_json_1 = __importDefault(require("./build/8453-tokens.json"));
const _8453_fresh_tokens_json_1 = __importDefault(require("./build/8453-fresh-tokens.json"));
exports.TOKEN_LIST = {
    // celo
    42220: _42220_tokens_json_1.default,
    celo: _42220_tokens_json_1.default,
    // base
    8453: _8453_tokens_json_1.default,
    base: _8453_tokens_json_1.default,
};
exports.FRESH_TOKEN_LIST = {
    // celo
    42220: _42220_fresh_tokens_json_1.default,
    celo: _42220_fresh_tokens_json_1.default,
    // base
    8453: _8453_fresh_tokens_json_1.default,
    base: _8453_fresh_tokens_json_1.default,
};
exports.default = exports.TOKEN_LIST;
