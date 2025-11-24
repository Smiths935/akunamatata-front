import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Search,
  RefreshCw,
  Plus,
  MapPin,
  Mail,
  Phone,
  Edit,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { restaurantService } from '@/lib/api';

const AdminRestaurantPage = () => {
    const [loading1, setLoading1] = React.useState(false);
    const [loading2, setLoading2] = React.useState(false);
    const [loading3, setLoading3] = React.useState(false);

    const [searchTerm, setSearchTerm] = React.useState('');
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingRestaurant, setEditingRestaurant] = React.useState(null);
    const [selectedRestaurant, setSelectedRestaurant] = React.useState(null);
    const [formData, setFormData] = React.useState({
        nom: '',
        telephone: '',
        email: '',
        latitude: '',
        longitude: ''
    });
    const queryClient = useQueryClient();

    // Récupérer les restaurants
    const { data: restaurantsData, isLoading } = useQuery({
        queryKey: ['admin-restaurants'],
        queryFn: restaurantService.getRestaurants,
        refetchInterval: 30000,
    });

    const restaurants = restaurantsData?.data?.restaurants || [];

    // Mutation pour supprimer un restaurant
      const deleteRestaurantMutation = useMutation({
        mutationFn: restaurantService.deleteRestaurant,
        onSuccess: () => {
          queryClient.invalidateQueries(['admin-restaurants']);
          toast.success('Restaurant supprimé');
        },
        onError: (error) => {
          toast.error(error.message || 'Erreur lors de la suppression');
        },
      });
    const deleteRestaurant = (id) => {
        setLoading3(true);
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce restaurant ?')) {
            deleteRestaurantMutation.mutate(id);
        }
        setLoading3(false);
    }
    
    const getLocalisation = () => {
        setLoading1(true);

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setFormData({
                ...formData,
                latitude: latitude,
                longitude: longitude
            });
        }, (error) => {
            console.error('Error getting location:', error);
            toast.error('Impossible de récupérer la localisation. Veuillez vérifier les permissions de localisation de votre navigateur.');
        });
        setLoading1(false);
    }

    const filteredRestaurants = restaurants.filter(restaurant => {
        if (!searchTerm) return restaurant;
        else return restaurant.nom.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => {
                const number = parseInt(word);
  
                if (isNaN(number)) return word[0];
                else return number;
            })
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading2(true);
        try {
            if (editingRestaurant) {
                await restaurantService.updateRestaurant(editingRestaurant._id, formData);
                toast.success('Restaurant modifié avec succès');
            } else {
                await restaurantService.createRestaurant(formData);
                toast.success('Restaurant créé avec succès');
            }
            
            setIsDialogOpen(false);
            setEditingRestaurant(null);
            resetForm();
        } catch(error) {
            console.error('Erreur lors de la sauvegarde:', error);
            toast.error('Erreur lors de la sauvegarde');
            toast.error(error.message);
        }
        setLoading2(false);
    };

    const resetForm = () => {
        setFormData({
            nom: '',
            telephone: '',
            email: '',
            latitude: '',
            longitude: ''
        });
        setEditingRestaurant(null);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (isLoading) {
        return (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold foodHive-text-gradient">Gestion des Restaurants</h1>
                    <p className="text-primary-foreground">
                        {filteredRestaurants.length} Restaurant{filteredRestaurants.length > 1 ? 's' : ''} trouvé{filteredRestaurants.length > 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0 text-primary-foreground">
                    <Button
                            onClick={() => queryClient.invalidateQueries(['admin-restaurants'])}
                            variant="outline"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                    </Button>
                    <Button className="foodHive-button-primary" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau Restaurant
                    </Button>
                </div>
            </motion.div>

            {/* Filtres */}
            <div className="flex flex-col md:flex-row gap-4 p-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4" color='white' />
                        <Input
                            placeholder="Rechercher par nom, email ou téléphone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 placeholder:text-primary-foreground"
                        />
                    </div>
                </div>
            </div>

            {/* Grille des restaurants */}
            <div className="space-y-4">
                {filteredRestaurants.length === 0 ? (
                    <div className="text-center py-12">
                        <MapPin className="h-16 w-16 mx-auto text-primary-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Aucun restaurant trouvé</h3>
                        <p className="text-primary-foreground">
                            Aucun restaurant ne correspond à vos critères de recherche
                        </p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        // className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {filteredRestaurants.map(restaurant => (
                            <Card 
                                key={restaurant._id}
                                className="hover:shadow-md transition-shadow mb-2" // 'foodHive-card cursor-pointer transition-all duration-200'
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback>
                                                    {getInitials(restaurant.nom)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">{restaurant.nom}</CardTitle>
                                                <CardDescription className="flex items-center space-x-4">
                                                    <span className="flex items-center text-foreground">
                                                        <Mail className="h-4 w-4 mr-1" />
                                                        {restaurant?.email}
                                                    </span>
                                                    {restaurant.telephone && (
                                                        <span className="flex items-center text-foreground">
                                                            <Phone className="h-4 w-4 mr-1" />
                                                            {restaurant.telephone}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center text-foreground">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {format(new Date(restaurant.dateCreation), 'dd/MM/yyyy', { locale: fr })}
                                                    </span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="flex items-center text-primary-foreground"
                                                        onClick={() => setSelectedRestaurant(restaurant)}
                                                    >
                                                        Détails
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className='pt-0 flex flex-col justify-end items-end'>
                                    <div className="flex space-x-2 mt-auto">
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingRestaurant(restaurant);
                                                    setFormData({
                                                        nom: restaurant.nom,
                                                        email: restaurant.email,
                                                        telephone: restaurant.telephone,
                                                        latitude: restaurant.latitude,
                                                        longitude: restaurant.longitude
                                                    })
                                                    setIsDialogOpen(true);
                                                }}
                                                className="flex-1 text-primary-foreground"
                                            >
                                                <Edit className="h-3 w-3 mr-1" />
                                                Modifier
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteRestaurant(restaurant._id)}
                                            >
                                                {loading3 ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Carte d'ajout */}
                        <Card className="foodHive-card border-dashed border-2 mt-4 border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsDialogOpen(true)}>
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold text-foreground">Ajouter un restaurant</h3>
                                <p className="text-sm text-foreground text-center mt-2">
                                    Créez un nouveau restaurant
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) }
            </div>

            {/* Dialog pour les détails du restaurant */}
            {selectedRestaurant && (
                <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Détails du Restaurant</DialogTitle>
                        <DialogDescription>
                            Informations complètes sur {selectedRestaurant.nom}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-xl">
                                    {getInitials(selectedRestaurant.nom)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold">{selectedRestaurant.nom}</h3>
                                <p className="text-muted-foreground">{selectedRestaurant.email}</p>
                            </div>
                        </div>

                        {/* Informations de contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium mb-2">Contact</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                        {selectedRestaurant.email}
                                    </div>
                                    {selectedRestaurant.telephone && (
                                        <div className="flex items-center">
                                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                            {selectedRestaurant.telephone}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">Dates importantes</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Inscrit le {format(new Date(selectedRestaurant.dateCreation), 'dd MMMM yyyy', { locale: fr })}
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Modifie le {format(new Date(selectedRestaurant?.dateModification), 'dd MMMM yyyy', { locale: fr })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Localisation */}
                        <div>
                            <div className="space-y-2 text-sm">
                                <h4 className="font-medium mb-2">Dates importantes</h4>
                                <div
                                    className='flex flex-col md:flex-row md:space-x-6 space-y-2 md:space-y-0'
                                >
                                    <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Longitude:  { selectedRestaurant.longitude }
                                    </div>

                                    <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Latitude:  { selectedRestaurant.latitude }
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </DialogContent>
                </Dialog>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingRestaurant ? 'Modifier le restaurant' : 'Nouveau restaurant'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRestaurant ? 'Modifiez les informations du restaurant' : 'Ajoutez un nouveau restaurant'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nom">Nom de la filliale</Label>
                            <Input
                                id="nom"
                                name="nom"
                                type="text"
                                value={formData.nom}
                                onChange={handleChange}
                                placeholder={editingRestaurant ? formData.nom : "Ex: Filliale 01"}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="telephone">Téléphone (entrer le numéro du service client de la filliale)</Label>
                            <Input
                                id="telephone"
                                name="telephone"
                                type="tel"
                                value={formData.telephone}
                                onChange={handleChange}
                                placeholder={editingRestaurant ? formData.telephone : "+237 XX XX XX XX"}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email (entrer l'email du service client de la filliale)</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={editingRestaurant ? formData.email : "************@exemple.com"}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Localisation (latitude et longitude)</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="latitude"
                                    name="latitude"
                                    type="text"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    placeholder={editingRestaurant ? formData.latitude : "Latitude"}
                                    required
                                />
                                <Input
                                    id="longitude"
                                    name="longitude"
                                    type="text"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    placeholder={editingRestaurant ? formData.longitude : "Longitude"}
                                    required
                                />
                                <Button type="button" className='text-primary-foreground' variant="outline" onClick={getLocalisation}>
                                    {loading1 ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Récupérer ma position
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" className="text-primary-foreground" onClick={() => {
                                setIsDialogOpen(false);
                                setEditingRestaurant(null);
                                resetForm();
                            }
                        }>
                            Annuler
                        </Button>
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700 foodHive-button-primary">
                            {loading2 ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                </>
                            ) : (
                                <>
                                    {editingRestaurant ? 'Modifier' : 'Créer'}
                                </>
                            )}
                        </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            
        </div>
    )
}

export default AdminRestaurantPage