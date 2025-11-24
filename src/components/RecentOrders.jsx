import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, CreditCard, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

import { formatPrice } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useCommandeStore } from '@/lib/store';
import { commandeService, paymentService } from '../lib/api';
import { Badge } from '@/components/ui/badge';

const RecentOrders = () => {
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [processingOrderId, setProcessingOrderId] = useState(null);

    const { commande, updateCommande } = useCommandeStore();
    useEffect(() => {
        if (isOrdersOpen) {
            commande.reverse();
            setOrders(commande);
            setIsLoading(false);
        }
    }, [isOrdersOpen, commande]);

    const getPaymentStatutByCommande = async (order) => {
        try {
            const response = await paymentService.getPaymentStatus(order._id);
            return response?.data?.status;
        } catch(error) {
            if(error?.status !== 404) toast.error(error.message);
        }
    }

    const handlePayOnline = async (order) => {
        setProcessingOrderId(`Pay-${order._id}`);
        if(order.statut === 'annulee') {
            toast.error("Impossible de payer une commande annulée.");
            setProcessingOrderId(null);
            return;
        }
        
        try {
            const paymentResponse = await paymentService.createPayment({ commandeId: order._id });

            const payment = paymentResponse?.data?.payment;
            if(paymentResponse?.status === 409 && payment?.status === "pending") {
                toast.error("Un paiement est déjà en cours pour cette commande.");
                setProcessingOrderId(null);
                return;
            }
            if(payment && payment?.status === "success") {
                toast.error("Cette commande a déjà été payée.");
                setProcessingOrderId(null);
                return;
            }

            const response = await paymentService.getPaymentLink(order._id, { url: window.location.href });
            setProcessingOrderId(null);
            
            toast.success("Redirection vers le paiement...");
            window.location.href = response.data.url;
        }catch (error) {
            console.error('Erreur lors de la création du paiement:', error);
            toast.error(error.message);
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleCancelOrder = async (order) => {
        setProcessingOrderId(`Cancel-${order._id}`);
            
        try {
            const paymentStatut = await getPaymentStatutByCommande(order);
            if(paymentStatut !== "failed" || paymentStatut !== "cancelled") {
                toast.error("Impossible d'annuler une commande avec un paiement en cours ou effectue.");
                setProcessingOrderId(null);
                return;
            }
            toast.success("Demande d'annulation envoyée.");
            const response = await commandeService.cancelCommande(order._id);
            toast.success("Commande annulée.");
            setOrders(prevCommandes => 
                prevCommandes.map(c => c._id === response?.data?.commande._id ? response?.data?.commande : c)
            );
            updateCommande(response?.data?.commande);
        } catch(error) {
            toast.error(error.message);
        } finally {
            setProcessingOrderId(null);
        }
    };

    return (
        <>
            <Button
                className="fixed bottom-4 left-4 p-4 rounded-full shadow-lg z-50 foodHive-button-primary"
                onClick={() => setIsOrdersOpen(true)}
                aria-label="Voir les commandes récentes"
            >
                <ShoppingBag className="h-6 w-6" />
            </Button>

            <AnimatePresence>
                {isOrdersOpen && (
                    <motion.div
                        className="fixed inset-0 z-[60] flex justify-start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-background/50"
                            onClick={() => setIsOrdersOpen(false)}
                        />
                        <motion.div
                            className="relative w-full max-w-sm shadow-lg flex flex-col max-h-[80vh]"
                            initial={{ y: '-100%' }}
                            animate={{ y: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        >
                            <div className="flex justify-between items-center bg-card p-4 border-b foodHive-card">
                                <h2 className="text-xl font-bold foodHive-text-gradient">Historique des commandes</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOrdersOpen(false)}
                                    aria-label="Fermer"
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            {isLoading && (
                                <div className="flex flex-1 justify-center items-center">
                                    <span className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></span>
                                </div>
                            )}

                            {!isLoading && orders.length === 0 && (
                                <div className="flex flex-1 flex-col bg-background/50 items-center justify-center p-4 text-center text-primary-foreground">
                                    <ShoppingBag className="h-12 w-12 mb-4" color='white' />
                                    <p>Aucune commande récente trouvée.</p>
                                </div>
                            )}

                            {!isLoading && orders.length > 0 && (
                                <ScrollArea className="flex-1 h-full p-4">
                                    {orders.map((order) => (
                                        <div key={order._id} className="mb-4 p-4 border rounded-lg foodHive-card">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-semibold text-lg">{order.numero}</h3>
                                                {/* <Badge>
                                                    {order.platId.restaurantId.nom}
                                                </Badge> */}
                                                <Badge
                                                    className={`text-sm bg-background font-medium ${
                                                        order.statut === 'livree' ? 'text-green-500' :
                                                        order.statut === 'annulee' ? 'text-red-500' :
                                                        'text-yellow-500'
                                                    }`}
                                                >
                                                    {order.statut.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-foreground/50">
                                                Date: {new Date(order.dateCommande).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm">
                                                Total TTC: <span className="font-bold">{formatPrice(order.total)}</span>
                                            </p>
                                            <ul className="mt-2 text-sm text-foreground/50">
                                                {order.items.map((item, index) => (
                                                    <li key={index} className="flex justify-between">
                                                        <span>{item.nom} x{item.quantite}</span>
                                                        <span>{formatPrice(item.prixUnitaire * item.quantite)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            
                                            {order.statut !== 'annulee' && (
                                                <div className="mt-4 flex gap-2">
                                                    <Button
                                                        // variant="secondary"
                                                        className="flex-1 w-full foodHive-button-primary"
                                                        onClick={() => handlePayOnline(order)}
                                                        disabled={
                                                            processingOrderId === `Pay-${order._id}` ||
                                                            order.statut === 'annulee'
                                                        }
                                                    >
                                                        {processingOrderId === `Pay-${order._id}` ? (
                                                            <>
                                                                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CreditCard className="h-4 w-4 mr-2" /> Payer en ligne
                                                            </>
                                                        )}
                                                    </Button>
                                                    
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 text-primary-foreground"
                                                        onClick={() => handleCancelOrder(order)}
                                                        disabled={
                                                            processingOrderId === `Cancel-${order._id}` ||
                                                            order.statut === 'annulee'
                                                        }
                                                    >
                                                        {processingOrderId === `Cancel-${order._id}` ? (
                                                            <>
                                                                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-primary rounded-full"></span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Ban className="h-4 w-4 mr-2" /> Annuler
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </ScrollArea>
                            )}
                        </motion.div> 
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default RecentOrders;