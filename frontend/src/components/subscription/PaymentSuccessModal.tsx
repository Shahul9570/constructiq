import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Download, Printer, ShieldCheck } from 'lucide-react'
import { PaymentReceipt } from '@/services/subscription.service'

interface PaymentSuccessModalProps {
  open: boolean
  onClose: () => void
  receipt: PaymentReceipt | null
}

export default function PaymentSuccessModal({
  open,
  onClose,
  receipt,
}: PaymentSuccessModalProps) {
  if (!receipt) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md p-6 text-center space-y-6 shadow-2xl">
        {/* Success Icon */}
        <div className="flex justify-center pt-2">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-white">Payment Confirmed!</h2>
          <p className="text-slate-400 text-xs">
            Your subscription to <strong className="text-orange-400 capitalize">{receipt.plan_tier} Tier</strong> has been activated.
          </p>
        </div>

        {/* Transaction Breakdown Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2.5 font-mono">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-400">
            <span>Transaction ID</span>
            <strong className="text-slate-200">{receipt.transaction_id}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Company Name</span>
            <strong className="text-slate-200">{receipt.company_name}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Plan Tier</span>
            <strong className="text-emerald-400 capitalize">{receipt.plan_tier} ({receipt.billing_cycle})</strong>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Payment Method</span>
            <strong className="text-slate-200 capitalize">{receipt.payment_method.replace('_', ' ')} (•••• {receipt.card_last4 || '4242'})</strong>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Base Amount</span>
            <strong className="text-slate-200">${receipt.amount.toFixed(2)}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Tax / GST (18%)</span>
            <strong className="text-slate-200">${receipt.tax_amount.toFixed(2)}</strong>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
            <span className="font-bold text-white">Total Paid</span>
            <strong className="text-orange-400 font-extrabold text-base">${receipt.total_amount.toFixed(2)}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex-1 bg-slate-900 border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-950/50"
          >
            Go to Subscription Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
