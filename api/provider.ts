import { ethers } from "ethers";
import config from "./config";

let provider: ethers.JsonRpcProvider | null = null;

export const getProvider = (): ethers.JsonRpcProvider => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.alchemy.rpcUrl());
  }
  return provider;
}; 