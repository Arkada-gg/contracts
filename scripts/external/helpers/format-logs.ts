import { ethers } from 'ethers';

const getNetworkName = (chainId: number) => {
  switch (chainId) {
    case 1868:
      return 'SONEIUM_MAINNET';
    case 146:
      return 'SONIC_MAINNET';
    default:
      throw new Error('Invalid chain id');
  }
};

interface AlchemyWebhookEvent {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    data: {
      block: {
        hash: string;
        number: number;
        timestamp: number;
        logs: Array<{
          data: string;
          topics: string[];
          index: number;
          account: {
            address: string;
          };
          transaction: {
            hash: string;
            nonce: number;
            index: number;
            from: {
              address: string;
            };
            to: {
              address: string;
            };
            value: string;
            gasPrice: string;
            maxFeePerGas: string | null;
            maxPriorityFeePerGas: string | null;
            gas: number;
            status: number;
            gasUsed: number;
            cumulativeGasUsed: number;
            effectiveGasPrice: string;
            createdContract: null;
          };
        }>;
      };
    };
    sequenceNumber: string;
    network: string;
  };
}

export function formatLogToAlchemyWebhook(
  log: any,
  chainId: number,
): AlchemyWebhookEvent {
  const ts = Date.now();

  const network = getNetworkName(chainId);

  return {
    webhookId: `wh_${Math.random().toString(36).slice(2, 16)}`,
    id: `whevt_${Math.random().toString(36).slice(2, 16)}`,
    createdAt: new Date(ts).toISOString(),
    type: 'GRAPHQL',
    event: {
      data: {
        block: {
          hash: log.blockHash,
          number: log.blockNumber,
          timestamp: Math.floor(ts / 1000),
          logs: [
            {
              data: log.data,
              topics: log.topics,
              index: log.logIndex,
              account: {
                address: log.address.toLowerCase(),
              },
              transaction: {
                hash: log.transactionHash,
                nonce: 0,
                index: 0,
                from: {
                  address: ethers.constants.AddressZero,
                },
                to: {
                  address: ethers.constants.AddressZero,
                },
                value: '0x0',
                gasPrice: '0x0',
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
                gas: 0,
                status: 1,
                gasUsed: 0,
                cumulativeGasUsed: 0,
                effectiveGasPrice: '0x0',
                createdContract: null,
              },
            },
          ],
        },
      },
      sequenceNumber: `100000000${Math.floor(Math.random() * 10000000000)}`,
      network,
    },
  };
}
