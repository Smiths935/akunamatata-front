import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import Header from './Header';
import Footer from './Footer';
import Cart from './Cart';
import RecentOrders from './RecentOrders';
import { useAuthStore, useUIStore, usePanierStore, useTableStore, useFavorisStore } from '@/lib/store';
import { panierService, userService } from '../lib/api';
import { usePaymentChecker } from "../hooks/usePaymentChecker";

const LayoutClient = () => {
  // Les hooks sont appelés au niveau supérieur du composant
  const isCartOpen = useUIStore().isCartOpen;
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const setPanier = usePanierStore().setPanier;
  const clearPanier = usePanierStore().clearPanier;
  const setFavoris = useFavorisStore().setFavoris;
  const clearFavoris = useFavorisStore().clearFavoris;
  const table = useTableStore().table;

  // Cette condition gère la déconnexion si le rôle de l'utilisateur n'est pas "client"
  if (user && user?.role !== 'client') {
    logout();
    navigate('/', { replace: true });
  }

  // Vérification de la validité du token
  useEffect(() => {
    const token = localStorage.getItem('foodHive_token');
    if (user && user.role === 'client' && !token) {
      console.warn('Token non trouvé, déconnexion de l\'utilisateur.');
      logout();
      navigate('/login', { replace: true });
    }
  }, [user, logout, navigate]);

  // Chargement du panier et des favoris
  useEffect(() => {
    const fetchCartAndFavorites = async () => {
      if (user && user?.role === 'client') {
        let queryParams = {};
        if (table) {
          queryParams = { tableId: table._id };
        }

        try {
          const responseP = await panierService.getPanier(user.id, queryParams);
          if (responseP.success) {
            setPanier(responseP?.data?.panier);
          } else {
            console.error('Panier non chargé:', responseP);
            clearPanier();
          }
        } catch (err) {
          if (err.status === 404) {
            console.log('Panier non trouvé, pas d\'action requise.');
            clearPanier();
            return;
          }
          else console.error('Erreur chargement panier:', err);
        }

        try {
          const responseF = await userService.getFavorites(user.id);
          if (responseF.success) {
            setFavoris(responseF?.data?.favoris);
          } else {
            console.error('Favoris non chargés:', responseF);
            clearFavoris();
          }
        } catch (err) {
          if (err.status === 404) {
            console.log('Favoris non trouvés, pas d\'action requise.');
            clearFavoris();
            return;
          }
          else console.error('Erreur chargement favoris:', err);
        }
      } else {
        if (!table) {
          clearPanier();
        } else {
          // try {
          //   const responseP = await panierService.getPanier('invité', { tableId: table._id });
          //   if (responseP.success) {
          //     setPanier(responseP?.data?.panier);
          //   } else {
          //     console.error('Panier non chargé:', responseP);
          //     clearPanier();
          //   }
          // } catch (err) {
          //   if (err.status === 404) {
          //     console.log('Panier invité non trouvé, pas d\'action requise.');
          //     clearPanier();
          //     return;
          //   }
          //   else console.error('Erreur chargement panier:', err);
          // }
        }
      }
    };

    fetchCartAndFavorites();
  }, [user, table, setPanier, clearPanier, setFavoris, clearFavoris]);

  const { isProcessing, hasParams } = usePaymentChecker();
  useEffect(() => {
    if (hasParams) {
      if (isProcessing) {
        toast.loading('Vérification du paiement en cours...', { duration: 5000 });
      } else {
        toast.dismiss();
        toast.success('Vérification du paiement terminée.', { duration: 5000 });
      }
    }
  }, [hasParams, isProcessing]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* En-tête */}
      <Header />

      {/* Contenu principal */}
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.main>

      {/* Pied de page */}
      <Footer />

      {/* Panier coulissant */}
      {isCartOpen && <Cart />}

      <RecentOrders />
    </div>
  );
};

export default LayoutClient;
