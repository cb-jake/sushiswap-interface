import { Contract } from '@ethersproject/contracts'
import { CurrencyAmount, Percent, Rebase, Token } from '@sushiswap/core-sdk'
import { ConstantProductPool, Fee } from '@sushiswap/trident-sdk'
import { v2Migration } from 'app/features/trident/migrate/context/migrateSlice'
import { calculateSlippageAmount, toShareCurrencyAmount } from 'app/functions'
import store from 'app/state'
import { PoolWithState } from 'app/types'

export const TRIDENT_MIGRATION_DEFAULT_SLIPPAGE = new Percent(50, 10_000) // .5%
const NEW_POOL_MIN_LP_RECIEVED = '1'

// Because twap setting is a boolean, a few more checks are necessary
export const getTwapSelection = (migration: v2Migration): boolean | undefined => {
  const matchingPoolTwap = migration.matchingTridentPool?.twapEnabled
  const newPoolTwap = migration.poolToCreate?.twap

  if (matchingPoolTwap !== undefined) {
    return matchingPoolTwap
  } else if (newPoolTwap !== undefined) {
    return newPoolTwap
  }
}

export const getSwapFee = (migration: v2Migration): Fee | undefined =>
  migration.matchingTridentPool?.swapFee || migration.poolToCreate?.fee

type pairAddress = string
type amount = string
type swapFee = number
type twapSupport = boolean
type minToken0Received = string
type minToken1Received = string
type minLpReceived = string

type TridentMigrateAction = [
  pairAddress,
  amount,
  swapFee,
  twapSupport,
  minToken0Received,
  minToken1Received,
  minLpReceived
]

function getMinLPRecieved(
  slippageOnTransaction: Percent,
  rebases: [Rebase | undefined, Rebase | undefined],
  selectedTridentPool?: PoolWithState<ConstantProductPool>,
  tridentPoolSupply?: CurrencyAmount<Token>
): string {
  if (!selectedTridentPool?.pool || !tridentPoolSupply) return NEW_POOL_MIN_LP_RECIEVED
  if (!rebases[0] || !rebases[1]) throw new Error('Rebases Missing')

  const liquidityMinted = selectedTridentPool.pool.getLiquidityMinted(
    tridentPoolSupply,
    toShareCurrencyAmount(rebases[0], selectedTridentPool.pool.reserve0),
    toShareCurrencyAmount(rebases[1], selectedTridentPool.pool.reserve1)
  )
  return calculateSlippageAmount(liquidityMinted, slippageOnTransaction)[0].toString()
}

interface TridentMigrateProps {
  contract: Contract
  migration: v2Migration
  v2LpTokenAmount: CurrencyAmount<Token>
  v2PoolTotalSupply: CurrencyAmount<Token>
  selectedTridentPool: PoolWithState<ConstantProductPool>
  tridentPoolSupply?: CurrencyAmount<Token>
  rebases: [Rebase | undefined, Rebase | undefined]
}

export const tridentMigrateAction = ({
  contract,
  migration,
  v2LpTokenAmount,
  v2PoolTotalSupply,
  selectedTridentPool,
  tridentPoolSupply,
  rebases,
}: TridentMigrateProps): string => {
  const swapFee = getSwapFee(migration)
  const twap = getTwapSelection(migration)
  if (!swapFee || twap === undefined) throw new Error('Missing required selection: Swap Fee')

  const v2LiquidityValues = {
    token0: migration.v2Pair.getLiquidityValue(migration.v2Pair.token0, v2PoolTotalSupply, v2LpTokenAmount),
    token1: migration.v2Pair.getLiquidityValue(migration.v2Pair.token1, v2PoolTotalSupply, v2LpTokenAmount),
  }

  const userSetSlippage = store.getState().user.userSlippageTolerance
  const slippageOnTransaction =
    userSetSlippage === 'auto' ? TRIDENT_MIGRATION_DEFAULT_SLIPPAGE : new Percent(userSetSlippage, 10_000)

  const minToken0Received = calculateSlippageAmount(v2LiquidityValues.token0, slippageOnTransaction)[0]
  const minToken1Received = calculateSlippageAmount(v2LiquidityValues.token1, slippageOnTransaction)[0]

  const migrateParams: TridentMigrateAction = [
    migration.v2Pair.liquidityToken.address,
    v2LpTokenAmount.quotient.toString(),
    swapFee,
    twap,
    minToken0Received.toString(),
    minToken1Received.toString(),
    getMinLPRecieved(slippageOnTransaction, rebases, selectedTridentPool, tridentPoolSupply),
  ]

  return contract.interface.encodeFunctionData('migrate', migrateParams)
}
