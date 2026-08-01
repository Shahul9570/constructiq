import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, ShieldCheck, Lock, QrCode, Building2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { subscriptionService, PaymentReceipt } from '@/services/subscription.service'

interface PaymentCheckoutModalProps {
  open: boolean
  onClose: () => void
  planTier: string
  billingCycle: 'monthly' | 'annual'
  price: number
  onSuccess: (receipt: PaymentReceipt) => void
}

export default function PaymentCheckoutModal({
  open,
  onClose,
  planTier,
  billingCycle,
  price,
  onSuccess,
}: PaymentCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'upi' | 'bank_transfer'>('credit_card')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const taxAmount = Math.round(price * 0.18 * 100) / 100
  const totalAmount = Math.round((price + taxAmount) * 100) / 100

  const handleFormatCardNumber = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim()
    setCardNumber(formatted)
  }

  const handleFormatExpiry = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`)
    } else {
      setExpiry(raw)
    }
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (price > 0 && paymentMethod === 'credit_card') {
      if (!cardName || !cardNumber || !expiry || !cvc) {
        toast.error('Please fill in all payment card details.')
        return
      }
    }

    setIsProcessing(true)
    try {
      const receipt = await subscriptionService.checkout({
        plan_tier: planTier,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        card_name: cardName,
        card_number: cardNumber.replace(/\s/g, ''),
      })

      setIsProcessing(false)
      onSuccess(receipt)
      onClose()
    } catch (err) {
      setIsProcessing(false)
      toast.error('Payment checkout failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Subscription Checkout</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                Complete payment to upgrade to <strong className="text-orange-400 capitalize">{planTier} Tier</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handlePaySubmit} className="p-6 space-y-5">
          {/* Order Summary Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 capitalize">{planTier} Tier ({billingCycle})</span>
              <span className="text-slate-200 font-semibold">${price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Estimated 18% Tax / GST</span>
              <span className="text-slate-200 font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
              <span className="text-xs font-bold text-white">Total Amount Due</span>
              <span className="text-lg font-extrabold text-orange-400 font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-300">Select Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="h-4 w-4" /> Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="h-4 w-4" /> UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="h-4 w-4" /> Wire / Transfer
              </button>
            </div>
          </div>

          {/* Form Fields */}
          {paymentMethod === 'credit_card' && price > 0 && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Cardholder Name</Label>
                <Input
                  placeholder="e.g. John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Card Number</Label>
                <Input
                  placeholder="4242 •••• •••• 4242"
                  value={cardNumber}
                  onChange={(e) => handleFormatCardNumber(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Expires (MM/YY)</Label>
                  <Input
                    placeholder="12/28"
                    value={expiry}
                    onChange={(e) => handleFormatExpiry(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-100 font-mono text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">CVC / CVV</Label>
                  <Input
                    placeholder="•••"
                    type="password"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-100 font-mono text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'upi' && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
              <QrCode className="h-12 w-12 mx-auto text-orange-400" />
              <p className="text-xs font-semibold text-slate-200">Scan QR Code or Enter UPI ID</p>
              <p className="text-[11px] text-slate-400 font-mono">constructiq@paytm</p>
            </div>
          )}

          {paymentMethod === 'bank_transfer' && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5 text-slate-300 font-mono">
              <div className="flex justify-between"><span>Bank:</span><strong className="text-white">Silicon Valley Bank</strong></div>
              <div className="flex justify-between"><span>A/C No:</span><strong className="text-white">984120349182</strong></div>
              <div className="flex justify-between"><span>IFSC / SWIFT:</span><strong className="text-white">SVB001923</strong></div>
            </div>
          )}

          {/* Secure Badge & Submit */}
          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pay ${totalAmount.toFixed(2)} & Activate Plan
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 256-bit SSL Encrypted & PCI-DSS Compliant
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
