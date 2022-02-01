import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Percent } from '@sushiswap/core-sdk'
import { AppState } from 'app/state'

const GLOBAL_DEFAULT_SLIPPAGE = new Percent(50, 10_000) // .5%

const initialState = {
  percent: GLOBAL_DEFAULT_SLIPPAGE,
}

export const slippageSlice = createSlice({
  name: 'slippage',
  initialState,
  reducers: {
    updateSlippage: (state, action: PayloadAction<Percent>) => {
      // for string func version?
      state.percent = action.payload
    },
  },
})

export const { updateSlippage } = slippageSlice.actions

// export const selectSlippageStr =
// isDefaultSlippageSelector---comparison

export const selectSlippage = (state: AppState) => state.slippage

export default slippageSlice.reducer
