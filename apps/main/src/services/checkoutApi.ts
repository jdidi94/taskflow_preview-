import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'

export type CheckoutSession = {
  id: string
  url: string | null
}

export const checkoutApi = createApi({
  reducerPath: 'checkoutApi',
  baseQuery,
  endpoints: (builder) => ({
    createCheckoutSession: builder.mutation<
      CheckoutSession,
      { plan: 'basic' | 'premium'; billingCycle?: 'monthly' | 'yearly' }
    >({
      query: ({ plan, billingCycle = 'monthly' }) => {
        const unitAmount = plan === 'premium' ? 2900 : 1200
        return {
          url: '/checkout/create-checkout-session',
          method: 'POST',
          body: {
            products: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: `TaskFlow ${plan}`,
                    description: `${billingCycle} subscription`,
                  },
                  unit_amount: unitAmount,
                },
                quantity: 1,
              },
            ],
            metadata: {
              plan,
              billing_cycle: billingCycle,
            },
          },
        }
      },
    }),
  }),
})

export const { useCreateCheckoutSessionMutation } = checkoutApi
