'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchPresets } from '@/lib/api/invoices'
import { getInnId } from '@/lib/auth'

export function useInvoicePresets() {
  return useQuery({
    queryKey: ['invoice-presets'],
    queryFn: async () => {
      const innId = await getInnId()
      if (!innId) return []
      return fetchPresets(innId)
    },
  })
}
