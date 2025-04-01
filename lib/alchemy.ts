import { Network, AlchemySettings } from 'alchemy-sdk';
import { NETWORKS } from '../api/config';

export const getAlchemyConfig = (network: Network): AlchemySettings => {
  return {
    apiKey: NETWORKS.ethereum.rpcUrl.split('/').pop() || '',
    network,
  };
}; 