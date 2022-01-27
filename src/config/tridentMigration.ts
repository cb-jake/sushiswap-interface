import { ChainId } from '@sushiswap/core-sdk'

export const tridentMigrationContracts: { [key in ChainId]?: string } = {
  [ChainId.KOVAN]: '0x9f85bC5EEe273624AE90B15970d05087Bf32c604',
  [ChainId.MATIC]: '0xFdD3B86128d4168cfB536931C7e31E2cF4Fc004A',
}
