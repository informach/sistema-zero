import { createRoot } from 'react-dom/client'
import { CouponShare } from '../../src/app/admin/catalogo/cupons/coupon-share'
import { ConvitesClient } from '../../src/app/admin/embaixadores/convites-client'
import { PlatformProvider } from '../../src/components/admin/platform-provider'
import { setPlatform } from '../../src/components/admin/platform-store'

const audience = new URLSearchParams(location.search).get('audience') === 'adult' ? 'adult' : 'kids'
setPlatform(audience)
createRoot(document.getElementById('root')!).render(
  <PlatformProvider initialPlatform={audience}>
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      {new URLSearchParams(location.search).has('coupon') ? (
        <CouponShare
          onClose={() => {}}
          coupon={{
            id: '33333333-3333-4333-8333-333333333333',
            version: 0,
            audience,
            code: 'SOLO.50',
            type: 'percent',
            percentOff: 50,
            amountOffCents: null,
            currency: 'BRL',
            status: 'active',
            appliesToAll: true,
            offerIds: [],
            minPurchaseCents: null,
            maxRedemptions: null,
            timesRedeemed: 0,
            validFrom: null,
            validUntil: null,
            createdAt: '',
            updatedAt: '',
          }}
        />
      ) : (
        <ConvitesClient currentRole="admin" />
      )}
    </main>
  </PlatformProvider>,
)
