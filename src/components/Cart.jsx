import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

import { panierService } from "../lib/api";
import { usePanierStore, useUIStore, useTableStore, useCommandeStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const Cart = () => {
    const { closeCart } = useUIStore();
    const { itemCount, panier, setPanier, clearPanier } = usePanierStore();
    const { table } = useTableStore();
    const [loading, setLoading] = useState({});
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [userCoords, setUserCoords] = useState(null);

    // Fonction pour envelopper les requêtes avec un état de chargement
    const withLoading = (id, action) => async () => {
        setLoading(prev => ({ ...prev, [id]: true }));
        try {
            await action();
        } finally {
            setLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    // Gestion des erreurs dans les promesses
    const handleError = (error, defaultMessage) => {
        console.error(defaultMessage, error);
        toast.error(error.response?.data?.message || defaultMessage);
    };

    const handleRemoveItem = async (platId) => {
        if (!panier?._id) return;
        try {
            const response = await panierService.removeItem(panier._id, platId);
            toast.success('Plat retiré du panier');
            setPanier(response?.data?.panier);
        } catch(error) {
            handleError(error, 'Erreur lors de la suppression du plat');
        }
    };

    const handleQuantityChange = async (platId, quantite) => {
        if (!panier?._id) return;
        if (quantite === 0) {
            await withLoading(`remove-${platId}`, () => handleRemoveItem(platId))();
        } else {
            const itemData = {
                platId: platId,
                quantite: quantite,
                commentaire: '',
            };
            try {
                const response = await panierService.updateItem(panier._id, itemData);
                setPanier(response?.data?.panier);
                toast.success('Panier mis à jour');
            } catch(error) {
                handleError(error, 'Erreur lors de la mise à jour du panier');
            }
        }
    };

    const handleClearPanier = async () => {
        if (!panier?._id) return;
        try {
            const response = await panierService.clearPanier(panier._id);
            toast.success('Panier vidé');
            setPanier(response?.data?.panier);
        } catch(error) {
            handleError(error, 'Erreur lors de la suppression des plats du panier');
        }
    };

    const handleCheckout = async () => {
        if (!panier?._id) {
            toast.error("Panier non trouvé. Veuillez actualiser la page.");
            return;
        }

        try {
            const commandeData = {
                modeCommande: table ? 'sur_place' : 'emporter',
            };

            if (!table) {
                if (!userCoords) {
                    toast.error("Localisation requise pour la livraison. Veuillez l'activer.");
                    return;
                }
                commandeData.latitude = userCoords.latitude;
                commandeData.longitude = userCoords.longitude;
            }

            const response = await panierService.convertToOrder(panier._id, commandeData);
            useCommandeStore.getState().addCommande(response?.data?.commande);
            toast.success('Commande passée. Veuillez patienter...');
            closeCart();
            clearPanier();
        } catch(error) {
            handleError(error, 'Erreur lors de la finalisation de la commande');
        }
    };

    const degToRad = (deg) => deg * (Math.PI / 180);

    const calculerDistance = (point1, point2) => {
        const R = 6371;
        const lat1Rad = degToRad(point1.latitude);
        const lon1Rad = degToRad(point1.longitude);
        const lat2Rad = degToRad(point2.latitude);
        const lon2Rad = degToRad(point2.longitude);

        const deltaLat = lat2Rad - lat1Rad;
        const deltaLon = lon2Rad - lon1Rad;

        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const calculerFraisLivraison = (restaurantCoords, userCoords) => {
        if (!userCoords || !restaurantCoords) {
            return 0;
        }
        const distance = calculerDistance(restaurantCoords, userCoords);
        const fraisDeBase = 1000;
        const coutParKm = 200;
        return fraisDeBase + (distance * coutParKm);
    };

    useEffect(() => {
        if (table || !("geolocation" in navigator)) {
            setUserCoords(null);
            setDeliveryFee(0);
            return;
        }
        
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserCoords(position.coords);
                const restaurant = panier?.items?.[0]?.platId?.restaurantId;
                if (restaurant) {
                    const fee = calculerFraisLivraison(
                        { latitude: restaurant.latitude, longitude: restaurant.longitude },
                        position.coords
                    );
                    setDeliveryFee(fee);
                }
            },
            (error) => {
                console.error('Erreur de géolocalisation:', error);
                toast.error('Impossible de récupérer la localisation. Vérifiez les permissions de votre navigateur.');
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [table, panier]);

    const unavailableItemCount = (panier) => {
        return panier?.items?.reduce((count, item) => {
            return item.platId?.disponible ? count : count + 1;
        }, 0);
    };

    const cartIsEmpty = !panier?.items || panier.items.length === 0 || unavailableItemCount(panier) === panier.items.length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50"
                onClick={closeCart}
            >
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center space-x-2">
                            <ShoppingBag className="h-5 w-5" />
                            <h2 className="text-lg font-semibold foodHive-text-gradient">Mon Panier</h2>
                            {itemCount > 0 && (
                                <Badge variant="secondary">{itemCount}</Badge>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={closeCart}>
                            <X className="h-5 w-5 text-primary-foreground" />
                        </Button>
                    </div>

                    {/* Contenu principal */}
                    {cartIsEmpty ? (
                        /* Panier vide */
                        <div className="flex-1 text-primary-foreground flex flex-col items-center justify-center p-8 text-center">
                            <ShoppingBag className="h-16 w-16 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
                            <p className="mb-6">
                                Ajoutez des plats délicieux à votre panier pour commencer
                            </p>
                            <Button onClick={closeCart}>
                                Découvrir le menu
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Liste des articles (contenu défilant) */}
                            <ScrollArea className="flex-1 h-full p-4">
                                <div className="space-y-4">
                                    {panier.items.map((item) => {
                                        if (!item.platId?.disponible) {
                                            return (
                                                <motion.div key={item.platId._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 rounded-md border border-destructive bg-destructive/10 text-destructive-foreground">
                                                    <p className="font-bold">{item.platId?.nom || "Plat indisponible"}</p>
                                                    <p>Ce plat n'est plus disponible. Veuillez le retirer du panier pour continuer.</p>
                                                </motion.div>
                                            )
                                        }
                                        return (
                                            <motion.div
                                                key={item.platId._id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="foodHive-card p-4"
                                            >
                                                <div className="flex space-x-3">
                                                    {/* Image du plat */}
                                                    <div className="flex-shrink-0">
                                                        <img
                                                            src={item.platId.imageUrl}
                                                            alt={item.platId.nom}
                                                            className="w-16 h-16 object-cover rounded-md"
                                                        />
                                                    </div>
                                                    {/* Détails */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm truncate">
                                                            {item.platId.nom}
                                                        </h4>
                                                        <p className="text-sm text-foreground">
                                                            {formatPrice(item.platId.prix)}
                                                        </p>
                                                        {/* Commentaires */}
                                                        {item.commentaires && (
                                                            <p className="text-xs text-foreground mt-1">
                                                                Note: {item.commentaires}
                                                            </p>
                                                        )}
                                                        {/* Contrôles quantité */}
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="flex items-center space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={withLoading(`minus-${item.platId._id}`, () => handleQuantityChange(item.platId._id, item.quantite - 1))}
                                                                    disabled={loading[`minus-${item.platId._id}`] || loading[`plus-${item.platId._id}`] || !item.platId.disponible}
                                                                >
                                                                    {loading[`minus-${item.platId._id}`] ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Minus className="h-3 w-3" color="white" />
                                                                    )}
                                                                </Button>
                                                                <span className="text-sm font-medium w-8 text-center">
                                                                    {item.quantite}
                                                                </span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={withLoading(`plus-${item.platId._id}`, () => handleQuantityChange(item.platId._id, item.quantite + 1))}
                                                                    disabled={loading[`minus-${item.platId._id}`] || loading[`plus-${item.platId._id}`] || !item.platId.disponible}
                                                                >
                                                                    {loading[`plus-${item.platId._id}`] ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="h-3 w-3" color="white" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-sm font-medium">
                                                                    {formatPrice(item.quantite * item.platId.prix)}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                    onClick={withLoading(`remove-${item.platId._id}`, () => handleRemoveItem(item.platId._id))}
                                                                    disabled={loading[`remove-${item.platId._id}`]}
                                                                >
                                                                    {loading[`remove-${item.platId._id}`] ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </>
                    )}
                    {/* Footer avec total et actions (toujours visible) */}
                    {!cartIsEmpty && (
                        <div className="border-t border-border p-4 space-y-4">
                            {/* Frais de livraison si table non selectionnée */}
                            {!table && (
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold">Livraison</span>
                                    <span className="text-lg font-bold text-primary">
                                        {formatPrice(deliveryFee)}
                                    </span>
                                </div>
                            )}
                            {/* Total */}
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold">Total HT</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatPrice(panier?.total)}
                                </span>
                            </div>
                            {/* TVA */}
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold">TVA</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatPrice(panier?.total * 0.18)}
                                </span>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="space-y-2">
                                <Button
                                    className="w-full foodHive-button-primary"
                                    onClick={withLoading('checkout', handleCheckout)}
                                    disabled={loading.checkout || unavailableItemCount(panier) > 0 || !panier?.items?.length || (!table && !userCoords)}
                                >
                                    {loading.checkout ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Traitement...
                                        </>
                                    ) : (
                                        `Commander (${formatPrice(panier?.total + panier?.total * 0.18 + deliveryFee)})`
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={withLoading('clear', handleClearPanier)}
                                    disabled={loading.clear || panier?.items?.length === 0}
                                >
                                    {loading.clear ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Nettoyage...
                                        </>
                                    ) : (
                                        'Vider le panier'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default Cart;