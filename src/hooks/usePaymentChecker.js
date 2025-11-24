
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { paymentService, commandeService } from '../lib/api';

export const usePaymentChecker = () => {
    const [searchParams] = useSearchParams();
    const [isProcessing, setIsProcessing] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const processCheckPayment = async () => {
            const payment_id = searchParams.get('paymentId');
            const payment_status = searchParams.get('paymentStatus');

            if (payment_id && payment_status) {
                setIsProcessing(true);

                try {
                    const response = await paymentService.verifyPayment(payment_id);
                    const commandeId = response?.data?.payment?.data?.metadata?.order_id;
                    const status = response?.data?.payment?.data?.status;
                    
                    const responseUpdate = await paymentService.updatePayment(commandeId, { status: status, moneeroPayment: payment_id });
                    navigate('/', { replace: true });
                } catch(error) {
                    console.error('Erreur lors de la vérification du paiement:', error);
                    toast.error('Une erreur est survenue lors de la vérification du paiement. Veuillez réessayer.', { duration: 5000 });
                } finally {
                    setIsProcessing(false);
                }
            }
        }

        processCheckPayment();
    }, [searchParams]);

    return {
        isProcessing,
        hasParams: !!(
            searchParams.get('paymentId') &&
            searchParams.get('paymentStatus')
        )
    }
}