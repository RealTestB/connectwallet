import { ethers } from 'ethers';
import { Alchemy, Network } from 'alchemy-sdk';
import { NETWORKS } from '../api/config';

let provider: ethers.JsonRpcProvider | null = null;

export const getProvider = async () => {
  if (!provider) {
    const config = {
      apiKey: NETWORKS.ethereum.rpcUrl.split('/').pop() || '',
      network: Network.ETH_MAINNET
    };

    const alchemy = new Alchemy(config);
    const alchemyProvider = await alchemy.config.getProvider();
    provider = new ethers.JsonRpcProvider(NETWORKS.ethereum.rpcUrl);
  }
  return provider;
}; 