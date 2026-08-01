import {
  BookOpen,
  Gift,
  Grid2X2,
  Hammer,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  PawPrint,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Store,
  Utensils,
  Wheat,
  Wrench,
} from 'lucide-react'

const sections = ['Todos', 'Liceo Procrear', 'Liceo 1ra', 'Liceo 2da', 'Liceo 3ra']
const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const categories = [
  { name: 'Todas', icon: Grid2X2, tone: 'lime' },
  { name: 'Comida', icon: Utensils, tone: 'orange' },
  { name: 'Verduleria', icon: ShoppingBasket, tone: 'green' },
  { name: 'Carniceria', icon: Store, tone: 'red' },
  { name: 'Despensa', icon: Store, tone: 'yellow' },
  { name: 'Ferreteria', icon: Wrench, tone: 'teal' },
  { name: 'Panaderia', icon: Wheat, tone: 'amber' },
  { name: 'Belleza', icon: Sparkles, tone: 'pink' },
  { name: 'Servicios', icon: Hammer, tone: 'blue' },
  { name: 'Indumentaria', icon: Shirt, tone: 'sky' },
  { name: 'Lenceria', icon: Heart, tone: 'rose' },
  { name: 'Salud', icon: HeartPulse, tone: 'mint' },
  { name: 'Mascotas', icon: PawPrint, tone: 'violet' },
  { name: 'Libreria', icon: BookOpen, tone: 'sand' },
  { name: 'Regaleria', icon: Gift, tone: 'coral' },
  { name: 'Tecnologia', icon: Laptop, tone: 'cyan' },
  { name: 'Hogar', icon: Home, tone: 'olive' },
]

const commerceCategories = categories.filter((category) => category.name !== 'Todas')
const categoryToneMap = Object.fromEntries(categories.map((category) => [category.name, category.tone]))
const offerToneCycle = ['orange', 'yellow', 'green', 'teal', 'amber', 'red', 'pink', 'sky', 'mint', 'coral']

const getOfferTone = (category = '', index = 0) => {
  const preferredTone = categoryToneMap[category]
  if (preferredTone && preferredTone !== 'lime' && index % 3 === 0) return preferredTone
  const seed = String(category).split('').reduce((total, char) => total + char.charCodeAt(0), index)
  return offerToneCycle[Math.abs(seed) % offerToneCycle.length]
}

const liceoMapQuery = 'Barrio Liceo Procrear Cordoba Argentina'
const liceoMapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(liceoMapQuery)}&output=embed`
const liceoMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(liceoMapQuery)}`
const liceoMapCenter = { lat: -31.3583, lng: -64.1212 }
const liceoMapBounds = {
  north: -31.3518,
  south: -31.3658,
  west: -64.1328,
  east: -64.1088,
}

const MAX_MENU_ITEMS = 15
const MENU_SECTION_SIZE = 5
const menuCatalogSections = [
  {
    title: 'Destacados',
    shortTitle: 'Destacados',
    hint: 'Combos, promos o lo mas pedido',
  },
  {
    title: 'Catalogo principal',
    shortTitle: 'Catalogo',
    hint: 'Productos o servicios que siempre ofreces',
  },
  {
    title: 'Extras y variantes',
    shortTitle: 'Extras',
    hint: 'Packs, tamanos, marcas, agregados o consultas',
  },
]


export {
  sections,
  weekDays,
  categories,
  commerceCategories,
  getOfferTone,
  liceoMapEmbedUrl,
  liceoMapUrl,
  liceoMapCenter,
  liceoMapBounds,
  MAX_MENU_ITEMS,
  MENU_SECTION_SIZE,
  menuCatalogSections,
}
