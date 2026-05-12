import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Eye, EyeOff, Info, X, Maximize2, Mountain, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Conductivity / gradient anomaly centers — stylized synthesis of features
// documented in the USMTArray national impedance map (Kelbert et al., 2026).
// amp = relative amplitude, sigma = spatial extent in degrees.
const ANOMALIES = [
  // Yellowstone & Snake River Plain hotspot track
  { lat: 44.43, lng: -110.59, amp: 1.55, sigma: 1.20 },
  { lat: 43.5,  lng: -113.5,  amp: 0.70, sigma: 1.60 },
  { lat: 43.2,  lng: -116.5,  amp: 0.55, sigma: 1.50 },
  // Cascade arc
  { lat: 41.41, lng: -122.19, amp: 0.90, sigma: 0.70 },
  { lat: 42.94, lng: -122.10, amp: 0.75, sigma: 0.70 },
  { lat: 45.37, lng: -121.70, amp: 0.75, sigma: 0.65 },
  { lat: 46.85, lng: -121.76, amp: 0.85, sigma: 0.70 },
  { lat: 46.20, lng: -121.49, amp: 0.55, sigma: 0.70 },
  // California
  { lat: 37.70, lng: -118.87, amp: 0.85, sigma: 0.85 },
  { lat: 33.20, lng: -115.50, amp: 1.05, sigma: 1.00 },
  { lat: 36.00, lng: -121.00, amp: 0.50, sigma: 1.00 },
  { lat: 40.40, lng: -124.10, amp: 0.70, sigma: 0.80 },
  // Basin & Range
  { lat: 39.0,  lng: -117.0,  amp: 0.50, sigma: 2.60 },
  { lat: 36.5,  lng: -116.0,  amp: 0.40, sigma: 2.00 },
  // Rio Grande Rift
  { lat: 36.5,  lng: -106.0,  amp: 0.75, sigma: 1.00 },
  { lat: 35.0,  lng: -106.5,  amp: 0.75, sigma: 1.00 },
  { lat: 33.0,  lng: -106.8,  amp: 0.55, sigma: 1.00 },
  // Colorado Plateau margins (the gradient lives at the edges)
  { lat: 35.5,  lng: -112.5,  amp: 0.55, sigma: 0.90 },
  { lat: 34.5,  lng: -110.0,  amp: 0.45, sigma: 0.90 },
  { lat: 38.5,  lng: -113.0,  amp: 0.55, sigma: 0.90 },
  { lat: 40.7,  lng: -110.0,  amp: 0.50, sigma: 0.90 },
  // Mid-Continent Rift
  { lat: 47.0,  lng: -88.5,   amp: 0.75, sigma: 1.30 },
  { lat: 42.0,  lng: -94.0,   amp: 0.50, sigma: 1.30 },
  { lat: 38.5,  lng: -97.5,   amp: 0.45, sigma: 1.20 },
  // Appalachian conductivity anomaly
  { lat: 41.0,  lng: -77.0,   amp: 0.55, sigma: 1.40 },
  { lat: 36.0,  lng: -82.0,   amp: 0.50, sigma: 1.30 },
  // New Madrid
  { lat: 36.5,  lng: -89.5,   amp: 0.60, sigma: 0.90 },
  // Northern Rockies / Coeur d'Alene mineral belt
  { lat: 47.5,  lng: -116.0,  amp: 0.55, sigma: 0.80 },
  // Wasatch front
  { lat: 40.5,  lng: -111.8,  amp: 0.55, sigma: 0.80 },
  // Connecticut Valley Mesozoic rift basin (subtle but real)
  { lat: 42.4,  lng: -72.6,   amp: 0.32, sigma: 0.60 },
];

const SITES = [
  { name: 'Sedona',              lat: 34.87, lng: -111.76, note: 'Vortex sites · Verde Valley, AZ' },
  { name: 'Mt. Shasta',          lat: 41.41, lng: -122.19, note: 'Cascade volcano · Wintu, Shasta sacred' },
  { name: 'Taos Pueblo',         lat: 36.44, lng: -105.55, note: 'Tiwa sacred · UNESCO' },
  { name: 'Yellowstone',         lat: 44.43, lng: -110.59, note: 'Sacred to 27+ tribes' },
  { name: 'Joshua Tree',         lat: 33.87, lng: -115.90, note: 'Modern pilgrimage · Cahuilla land' },
  { name: 'Mt. Tamalpais',       lat: 37.92, lng: -122.59, note: 'Coast Miwok · "Sleeping Maiden"' },
  { name: 'Crater Lake',         lat: 42.94, lng: -122.10, note: 'Klamath sacred · caldera lake' },
  { name: 'Devils Tower',        lat: 44.59, lng: -104.71, note: 'Mato Tipila · Lakota, Cheyenne' },
  { name: 'Bear Butte',          lat: 44.47, lng: -103.43, note: 'Mato Paha · Lakota, Cheyenne' },
  { name: 'Chaco Canyon',        lat: 36.06, lng: -107.96, note: 'Ancestral Puebloan ceremonial center' },
  { name: 'Mesa Verde',          lat: 37.18, lng: -108.49, note: 'Ancestral Puebloan dwellings' },
  { name: 'Shiprock',            lat: 36.69, lng: -108.84, note: "Tsé Bit\u02bca\u02bcí · Diné sacred" },
  { name: 'Mt. Rainier',         lat: 46.85, lng: -121.76, note: 'Tahoma · Salish, Yakama' },
  { name: 'San Francisco Peaks', lat: 35.35, lng: -111.68, note: "Sacred to 13 tribes · Hopi Nuvatukya\u02bcovi" },
  { name: 'Cahokia Mounds',      lat: 38.66, lng: -90.06,  note: 'Mississippian ceremonial center' },
  { name: 'Serpent Mound',       lat: 39.03, lng: -83.43,  note: 'Effigy mound · Adena culture, OH' },
  { name: 'Mt. Katahdin',        lat: 45.90, lng: -68.92,  note: 'Penobscot · "Greatest Mountain"' },
  { name: 'Mt. Hood',            lat: 45.37, lng: -121.70, note: "Wy'east · Multnomah sacred" },
  { name: 'Lake Tahoe',          lat: 39.09, lng: -120.04, note: 'Washoe sacred' },
  { name: 'Mono Lake',           lat: 38.00, lng: -119.00, note: "Kutzadika'a Paiute sacred" },
  { name: 'Canyon de Chelly',    lat: 36.13, lng: -109.46, note: 'Diné continuous habitation' },
  { name: 'Hot Springs',         lat: 34.51, lng: -93.05,  note: 'Quapaw, Caddo healing waters' },
  { name: 'Avi Kwa Ame',         lat: 35.32, lng: -114.71, note: 'Spirit Mountain · Mojave creation site' },
  { name: 'Bandelier',           lat: 35.78, lng: -106.27, note: 'Ancestral Puebloan dwellings' },
  { name: 'Black Hills',         lat: 43.88, lng: -103.46, note: 'Pahá Sápa · Lakota sacred heart' },
  { name: 'Mount Mitchell',      lat: 35.76, lng: -82.27,  note: 'Highest E. of Mississippi · Cherokee' },
  { name: 'Mount Toby',          lat: 42.4747, lng: -72.5237, note: 'Pioneer Valley · MA traprock summit' },
  { name: 'Brattleboro',         lat: 42.8509, lng: -72.5579, note: 'VT · Connecticut Valley rift' },
];

// Thumbnails for each sacred site, bundled locally from Wikipedia.
// To refresh or add images: edit scripts/fetch-site-images.mjs and re-run it.
// Each entry maps site name -> filename (kebab-case) under src/assets/sites/.
const SITE_IMAGE_FILES = {
  'Sedona':              'sedona',
  'Mt. Shasta':          'mt-shasta',
  'Taos Pueblo':         'taos-pueblo',
  'Yellowstone':         'yellowstone',
  'Joshua Tree':         'joshua-tree',
  'Mt. Tamalpais':       'mt-tamalpais',
  'Crater Lake':         'crater-lake',
  'Devils Tower':        'devils-tower',
  'Bear Butte':          'bear-butte',
  'Chaco Canyon':        'chaco-canyon',
  'Mesa Verde':          'mesa-verde',
  'Shiprock':            'shiprock',
  'Mt. Rainier':         'mt-rainier',
  'San Francisco Peaks': 'san-francisco-peaks',
  'Cahokia Mounds':      'cahokia-mounds',
  'Serpent Mound':       'serpent-mound',
  'Mt. Katahdin':        'mt-katahdin',
  'Mt. Hood':            'mt-hood',
  'Lake Tahoe':          'lake-tahoe',
  'Mono Lake':           'mono-lake',
  'Canyon de Chelly':    'canyon-de-chelly',
  'Hot Springs':         'hot-springs',
  'Avi Kwa Ame':         'avi-kwa-ame',
  'Bandelier':           'bandelier',
  'Black Hills':         'black-hills',
  'Mount Mitchell':      'mount-mitchell',
  'Mount Toby':          'mount-toby',
  'Brattleboro':         'brattleboro',
};

// Vite resolves these to hashed asset URLs at build time. Eager import so the
// thumbnail map is available synchronously on first render — no loading state.
const siteImageModules = import.meta.glob('./assets/sites/*.jpg', {
  eager: true,
  import: 'default',
});

const SITE_IMAGES = Object.fromEntries(
  Object.entries(SITE_IMAGE_FILES).map(([name, slug]) => [
    name,
    siteImageModules[`./assets/sites/${slug}.jpg`] ?? null,
  ])
);

// Geological "what's actually there" — the named feature responsible for each
// anomaly center. Pinned to the same lat/lng as ANOMALIES.
const GEO_POI = [
  { lat: 44.43, lng: -110.59, label: 'Yellowstone Caldera',          kind: 'Active hotspot magma chamber' },
  { lat: 43.5,  lng: -113.5,  label: 'Snake River Plain',            kind: 'Hotspot track · basaltic' },
  { lat: 41.41, lng: -122.19, label: 'Mt. Shasta',                   kind: 'Cascade stratovolcano' },
  { lat: 42.94, lng: -122.10, label: 'Crater Lake (Mt. Mazama)',     kind: 'Caldera · Cascade arc' },
  { lat: 45.37, lng: -121.70, label: 'Mt. Hood',                     kind: 'Cascade stratovolcano' },
  { lat: 46.85, lng: -121.76, label: 'Mt. Rainier',                  kind: 'Cascade stratovolcano' },
  { lat: 37.70, lng: -118.87, label: 'Long Valley Caldera',          kind: 'Active resurgent caldera' },
  { lat: 33.20, lng: -115.50, label: 'Salton Trough',                kind: 'Spreading rift · brines' },
  { lat: 40.40, lng: -124.10, label: 'Mendocino Triple Junction',    kind: 'Plate boundary · transform' },
  { lat: 39.0,  lng: -117.0,  label: 'Basin & Range',                kind: 'Extensional province' },
  { lat: 36.5,  lng: -106.0,  label: 'Rio Grande Rift (north)',      kind: 'Continental rift · Taos plateau' },
  { lat: 35.0,  lng: -106.5,  label: 'Rio Grande Rift (Albuquerque)', kind: 'Continental rift basin' },
  { lat: 35.5,  lng: -112.5,  label: 'Colorado Plateau (S edge)',    kind: 'Plateau-margin gradient' },
  { lat: 38.5,  lng: -113.0,  label: 'Colorado Plateau (W edge)',    kind: 'Plateau-margin gradient' },
  { lat: 47.0,  lng: -88.5,   label: 'Mid-Continent Rift (Lake Superior)', kind: 'Failed Proterozoic rift' },
  { lat: 42.0,  lng: -94.0,   label: 'Mid-Continent Rift (Iowa arm)', kind: 'Buried rift · gravity-high' },
  { lat: 41.0,  lng: -77.0,   label: 'Appalachian Conductivity Anomaly', kind: 'Crustal-scale graphite shear' },
  { lat: 36.0,  lng: -82.0,   label: 'Southern Appalachians',         kind: 'Orogen root · Blue Ridge' },
  { lat: 36.5,  lng: -89.5,   label: 'New Madrid Seismic Zone',       kind: 'Reactivated rift · seismic' },
  { lat: 47.5,  lng: -116.0,  label: 'Coeur d’Alene Mineral Belt',    kind: 'Sulfide-rich crustal trend' },
  { lat: 40.5,  lng: -111.8,  label: 'Wasatch Front',                 kind: 'Active normal-fault scarp' },
  { lat: 42.4,  lng: -72.6,   label: 'Connecticut Valley Rift',       kind: 'Mesozoic basin · traprock' },
];

// "The Piedmont Resistor" — a buried ~200 Ma slab of igneous basement along
// the eastern Appalachian piedmont, named because it blocks electrical
// current rather than passing it. The mirror of the conductive anomalies:
// same Gaussian-centers + depth-profile model, inverted visual treatment.
// Modeled as a NE→SW band; coords nudged inland from the original brief so
// the centers sit on the actual piedmont rather than the coast. Discovered
// by the USMTArray and described in Kelbert et al. (2026).
const RESISTORS = [
  { lat: 45.5, lng: -70.5, amp: 0.70, sigma: 1.60 }, // Maine
  { lat: 43.5, lng: -71.8, amp: 0.70, sigma: 1.60 }, // NH / MA
  { lat: 41.7, lng: -72.7, amp: 0.70, sigma: 1.60 }, // CT
  { lat: 40.3, lng: -75.0, amp: 0.70, sigma: 1.60 }, // NJ / PA
  { lat: 38.7, lng: -77.0, amp: 0.70, sigma: 1.60 }, // DC / VA
  { lat: 36.5, lng: -79.0, amp: 0.70, sigma: 1.60 }, // NC
  { lat: 34.5, lng: -81.5, amp: 0.70, sigma: 1.60 }, // SC
  { lat: 33.0, lng: -83.5, amp: 0.70, sigma: 1.60 }, // GA
];

// Single shared depth-intensity profile. Tuned for visual contrast against
// the conductors, not as literal inversion output — the published paper
// resolves a fatter, less peaked body. Treat layer values as illustrative.
const RESISTOR_PROFILE_PIEDMONT = [
  { topKm: 0,   botKm: 5,   intensity: 0.30 }, // sedimentary cover · not resistive
  { topKm: 5,   botKm: 30,  intensity: 0.85 }, // top of resistor
  { topKm: 30,  botKm: 100, intensity: 0.95 }, // peak resistance
  { topKm: 100, botKm: 200, intensity: 0.70 }, // tapering at depth
];

function intensityAtDepthResistor(km) {
  const layer = RESISTOR_PROFILE_PIEDMONT.find(l => km >= l.topKm && km <= l.botKm);
  return layer ? layer.intensity : 0.30;
}

// Stylized depth–conductivity profiles for each anomaly center, synthesized from
// published MT literature (Bedrosian 2007/2014/2024, Kim 2025, Wannamaker 2008,
// Meqbel 2014, Murphy 2022, Kelbert 2026). Layers are illustrative; intensity
// 0–1, depth in km from surface. Real inversions vary by site; these capture
// the qualitative signature.
const DEPTH_PROFILES = {
  'Yellowstone Caldera': {
    signature: 'Hotspot caldera · upper-crustal magma + deep plume',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.45, label: 'Volcanic & sedimentary cover' },
      { topKm: 5,   botKm: 17,  intensity: 0.95, label: 'Upper-crustal magma reservoir' },
      { topKm: 17,  botKm: 40,  intensity: 0.75, label: 'Lower-crustal melt + fluids' },
      { topKm: 40,  botKm: 110, intensity: 0.85, label: 'Mantle plume conductor' },
      { topKm: 110, botKm: 250, intensity: 0.55, label: 'Asthenospheric melt' },
    ],
    note: 'Two-tier system: a shallow rhyolitic chamber feeds the caldera; a deep mantle plume sustains it. The strongest MT signal is around 5–15 km.',
  },
  'Snake River Plain': {
    signature: 'Hotspot track · basaltic crust',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.30, label: 'Basalt flows + sediment' },
      { topKm: 3,   botKm: 12,  intensity: 0.55, label: 'Mafic intrusive complex' },
      { topKm: 12,  botKm: 35,  intensity: 0.45, label: 'Intruded lower crust' },
      { topKm: 35,  botKm: 90,  intensity: 0.65, label: 'Hot mantle wedge · partial melt' },
      { topKm: 90,  botKm: 220, intensity: 0.45, label: 'Asthenosphere' },
    ],
    note: 'A 16-million-year scar across Idaho marking the path of the North American plate over the Yellowstone hotspot. Crust is heavily basaltic.',
  },
  'Mt. Shasta': {
    signature: 'Cascade arc stratovolcano',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.40, label: 'Volcanic edifice + cone' },
      { topKm: 3,   botKm: 8,   intensity: 0.70, label: 'Shallow conduit' },
      { topKm: 8,   botKm: 30,  intensity: 0.85, label: 'Mid-crustal magma reservoir' },
      { topKm: 30,  botKm: 70,  intensity: 0.60, label: 'Mantle wedge · slab fluids' },
      { topKm: 70,  botKm: 200, intensity: 0.40, label: 'Subducting Juan de Fuca slab' },
    ],
    note: 'Subduction-fed: water released from the descending oceanic slab triggers melting in the mantle wedge, which rises and pools mid-crust.',
  },
  'Crater Lake (Mt. Mazama)': {
    signature: 'Cascade caldera · post-collapse',
    layers: [
      { topKm: 0,   botKm: 2,   intensity: 0.50, label: 'Caldera fill + lake' },
      { topKm: 2,   botKm: 10,  intensity: 0.80, label: 'Residual upper-crustal magma' },
      { topKm: 10,  botKm: 30,  intensity: 0.65, label: 'Mid-crustal mush zone' },
      { topKm: 30,  botKm: 70,  intensity: 0.55, label: 'Mantle wedge fluids' },
      { topKm: 70,  botKm: 200, intensity: 0.40, label: 'Subducting slab' },
    ],
    note: 'Mt. Mazama collapsed 7,700 years ago in a cataclysmic eruption. Shallow magma still partly remains; the deeper plumbing is shared with the rest of the Cascade arc.',
  },
  'Mt. Hood': {
    signature: 'Cascade arc stratovolcano',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.40, label: 'Volcanic edifice' },
      { topKm: 3,   botKm: 10,  intensity: 0.65, label: 'Shallow conduit / dike' },
      { topKm: 10,  botKm: 30,  intensity: 0.80, label: 'Mid-crustal magma reservoir' },
      { topKm: 30,  botKm: 70,  intensity: 0.55, label: 'Mantle wedge melt' },
      { topKm: 70,  botKm: 200, intensity: 0.40, label: 'Subducting slab' },
    ],
    note: "Wy'east. Active stratovolcano fed by Juan de Fuca slab dehydration. Last erupted around 1865; small magma body is currently quiet.",
  },
  'Mt. Rainier': {
    signature: 'Cascade arc stratovolcano · highest in range',
    layers: [
      { topKm: 0,   botKm: 4,   intensity: 0.55, label: 'Glaciers + edifice' },
      { topKm: 4,   botKm: 10,  intensity: 0.75, label: 'Hydrothermal system' },
      { topKm: 10,  botKm: 30,  intensity: 0.85, label: 'Mid-crustal magma reservoir' },
      { topKm: 30,  botKm: 70,  intensity: 0.55, label: 'Mantle wedge melt' },
      { topKm: 70,  botKm: 200, intensity: 0.40, label: 'Subducting slab' },
    ],
    note: 'Tahoma. The most dangerous Cascade volcano due to ice-clad lahar potential, though the magma body itself is moderate-sized.',
  },
  'Long Valley Caldera': {
    signature: 'Resurgent caldera · still active',
    layers: [
      { topKm: 0,   botKm: 4,   intensity: 0.55, label: 'Caldera fill + Bishop Tuff' },
      { topKm: 4,   botKm: 12,  intensity: 0.90, label: 'Shallow magma chamber' },
      { topKm: 12,  botKm: 30,  intensity: 0.65, label: 'Lower-crustal melt' },
      { topKm: 30,  botKm: 80,  intensity: 0.55, label: 'Hot mantle' },
      { topKm: 80,  botKm: 200, intensity: 0.40, label: 'Asthenosphere' },
    ],
    note: 'Erupted 760,000 years ago; the resurgent dome is still inflating and the magma body is under continuous monitoring. One of the largest known calderas.',
  },
  'Salton Trough': {
    signature: 'Spreading rift · hypersaline geothermal',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.95, label: 'Hot brines + sediments' },
      { topKm: 3,   botKm: 8,   intensity: 0.85, label: 'Geothermal reservoir' },
      { topKm: 8,   botKm: 20,  intensity: 0.75, label: 'Spreading-axis intrusives' },
      { topKm: 20,  botKm: 50,  intensity: 0.60, label: 'Thinned crust + new mafic' },
      { topKm: 50,  botKm: 150, intensity: 0.55, label: 'Asthenosphere · shallow' },
    ],
    note: 'A baby ocean basin on land. The Salton Trough is the northern tip of the Gulf of California spreading system — extremely thin crust, hot brines, active geothermal.',
  },
  'Mendocino Triple Junction': {
    signature: 'Plate-boundary triple point',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.40, label: 'Coastal sediments' },
      { topKm: 5,   botKm: 25,  intensity: 0.50, label: 'Sheared accretionary crust' },
      { topKm: 25,  botKm: 60,  intensity: 0.75, label: 'Slab edge + mantle upwelling' },
      { topKm: 60,  botKm: 150, intensity: 0.65, label: 'Slab window asthenosphere' },
      { topKm: 150, botKm: 250, intensity: 0.45, label: 'Deep mantle' },
    ],
    note: 'Where Pacific, North American, and Juan de Fuca plates meet. Slab-edge effects produce a "window" of upwelling hot mantle below.',
  },
  'Basin & Range': {
    signature: 'Extensional province · broadly hot',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.40, label: 'Basin fill sediments' },
      { topKm: 5,   botKm: 15,  intensity: 0.55, label: 'Faulted upper crust' },
      { topKm: 15,  botKm: 35,  intensity: 0.70, label: 'Lower-crustal melt zones' },
      { topKm: 35,  botKm: 80,  intensity: 0.65, label: 'Shallow asthenosphere' },
      { topKm: 80,  botKm: 200, intensity: 0.50, label: 'Hot mantle' },
    ],
    note: 'Crust stretched and thinned by ~2× since 30 Ma. The asthenosphere sits unusually shallow, making the whole province broadly conductive.',
  },
  'Rio Grande Rift (north)': {
    signature: 'Active continental rift',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.45, label: 'Rift basin fill' },
      { topKm: 5,   botKm: 20,  intensity: 0.55, label: 'Faulted upper crust' },
      { topKm: 20,  botKm: 40,  intensity: 0.85, label: 'Lower-crustal melt' },
      { topKm: 40,  botKm: 90,  intensity: 0.75, label: 'Mantle melt zone' },
      { topKm: 90,  botKm: 200, intensity: 0.50, label: 'Asthenosphere' },
    ],
    note: 'A continent slowly tearing itself apart. The northern segment passes through Taos and the Sangre de Cristo range — active but slow extension.',
  },
  'Rio Grande Rift (Albuquerque)': {
    signature: 'Active continental rift · central segment',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.50, label: 'Rift basin fill' },
      { topKm: 5,   botKm: 20,  intensity: 0.60, label: 'Faulted upper crust' },
      { topKm: 20,  botKm: 40,  intensity: 0.85, label: 'Lower-crustal melt' },
      { topKm: 40,  botKm: 90,  intensity: 0.75, label: 'Mantle melt zone' },
      { topKm: 90,  botKm: 200, intensity: 0.50, label: 'Asthenosphere' },
    ],
    note: 'The widest part of the rift. The Albuquerque basin sits over thinned crust with active deep magmatism beneath.',
  },
  'Colorado Plateau (S edge)': {
    signature: 'Plateau-margin gradient',
    layers: [
      { topKm: 0,   botKm: 4,   intensity: 0.30, label: 'Sedimentary cover' },
      { topKm: 4,   botKm: 25,  intensity: 0.40, label: 'Stable plateau crust' },
      { topKm: 25,  botKm: 50,  intensity: 0.65, label: 'Lithospheric step' },
      { topKm: 50,  botKm: 120, intensity: 0.55, label: 'Edge-driven mantle melt' },
      { topKm: 120, botKm: 200, intensity: 0.40, label: 'Deep mantle' },
    ],
    note: 'The plateau itself is geologically quiet, but its edges are dynamic — small-scale mantle convection at the lithospheric step produces conductivity contrasts.',
  },
  'Colorado Plateau (W edge)': {
    signature: 'Plateau-margin gradient',
    layers: [
      { topKm: 0,   botKm: 4,   intensity: 0.30, label: 'Sedimentary cover' },
      { topKm: 4,   botKm: 25,  intensity: 0.40, label: 'Stable plateau crust' },
      { topKm: 25,  botKm: 50,  intensity: 0.65, label: 'Lithospheric step' },
      { topKm: 50,  botKm: 120, intensity: 0.55, label: 'Edge-driven mantle melt' },
      { topKm: 120, botKm: 200, intensity: 0.40, label: 'Deep mantle' },
    ],
    note: 'The western edge faces Basin & Range extension. The contrast between rigid plateau and stretched crust drives small-scale convection.',
  },
  'Mid-Continent Rift (Lake Superior)': {
    signature: 'Failed Proterozoic rift · 1.1 Ga',
    layers: [
      { topKm: 0,   botKm: 8,   intensity: 0.85, label: 'Rift sediments + sulfides' },
      { topKm: 8,   botKm: 20,  intensity: 0.75, label: 'Mafic flood basalts' },
      { topKm: 20,  botKm: 40,  intensity: 0.55, label: 'Underplated lower crust' },
      { topKm: 40,  botKm: 100, intensity: 0.35, label: 'Cold cratonic mantle' },
      { topKm: 100, botKm: 200, intensity: 0.30, label: 'Lithosphere' },
    ],
    note: 'A continent-scale rift that nearly split North America 1.1 billion years ago, then stalled. Filled with lavas and conductive sulfide-bearing sediments.',
  },
  'Mid-Continent Rift (Iowa arm)': {
    signature: 'Buried rift arm · gravity high',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.30, label: 'Phanerozoic cover' },
      { topKm: 3,   botKm: 12,  intensity: 0.60, label: 'Buried rift sediments' },
      { topKm: 12,  botKm: 30,  intensity: 0.55, label: 'Mafic intrusive core' },
      { topKm: 30,  botKm: 100, intensity: 0.30, label: 'Cratonic mantle' },
      { topKm: 100, botKm: 200, intensity: 0.30, label: 'Lithosphere' },
    ],
    note: 'The southern arm of the rift, completely buried under Paleozoic cover. Detected by gravity anomalies and now confirmed by MT.',
  },
  'Appalachian Conductivity Anomaly': {
    signature: 'Ancient graphite shear zone',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.30, label: 'Sedimentary cover' },
      { topKm: 5,   botKm: 15,  intensity: 0.45, label: 'Folded basement' },
      { topKm: 15,  botKm: 40,  intensity: 0.85, label: 'Graphite-bearing shear zone' },
      { topKm: 40,  botKm: 80,  intensity: 0.40, label: 'Sub-Moho mantle' },
      { topKm: 80,  botKm: 200, intensity: 0.30, label: 'Cold lithosphere' },
    ],
    note: 'A fossil from continental assembly: CO₂-rich fluids precipitated graphite films along ancient transform faults. Now permanently conductive even though long-dead.',
  },
  'Southern Appalachians': {
    signature: 'Orogenic root · Blue Ridge',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.30, label: 'Folded sediments' },
      { topKm: 5,   botKm: 20,  intensity: 0.50, label: 'Crystalline basement' },
      { topKm: 20,  botKm: 45,  intensity: 0.70, label: 'Thickened orogen root' },
      { topKm: 45,  botKm: 100, intensity: 0.40, label: 'Cold mantle lithosphere' },
      { topKm: 100, botKm: 200, intensity: 0.30, label: 'Lithosphere' },
    ],
    note: 'Roots of mountains that were once Himalayan-scale. The thickened crust still hosts conductive features 250 million years after the building.',
  },
  'New Madrid Seismic Zone': {
    signature: 'Reactivated rift · seismically active',
    layers: [
      { topKm: 0,   botKm: 5,   intensity: 0.55, label: 'Mississippi embayment fill' },
      { topKm: 5,   botKm: 20,  intensity: 0.70, label: 'Reelfoot Rift sediments' },
      { topKm: 20,  botKm: 40,  intensity: 0.65, label: 'Rifted basement + fluids' },
      { topKm: 40,  botKm: 100, intensity: 0.40, label: 'Sub-rift mantle' },
      { topKm: 100, botKm: 200, intensity: 0.30, label: 'Lithosphere' },
    ],
    note: "Failed rift that won't stay dead. Produced the largest earthquakes in eastern U.S. history (1811-12). Conductive fluids in the rift basement may lubricate ancient faults.",
  },
  'Coeur d\u2019Alene Mineral Belt': {
    signature: 'Sulfide-rich crustal trend',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.50, label: 'Belt Supergroup sediments' },
      { topKm: 3,   botKm: 12,  intensity: 0.85, label: 'Sulfide ore zone' },
      { topKm: 12,  botKm: 30,  intensity: 0.55, label: 'Sheared crystalline basement' },
      { topKm: 30,  botKm: 80,  intensity: 0.35, label: 'Cold mantle lithosphere' },
      { topKm: 80,  botKm: 200, intensity: 0.30, label: 'Lithosphere' },
    ],
    note: 'One of the world\u2019s richest silver districts. The shallow sulfide veins are extremely conductive — MT can map ore trends from the surface.',
  },
  'Wasatch Front': {
    signature: 'Active normal-fault scarp',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.50, label: 'Lake Bonneville sediments' },
      { topKm: 3,   botKm: 12,  intensity: 0.75, label: 'Fluid-filled fault zone' },
      { topKm: 12,  botKm: 30,  intensity: 0.55, label: 'Faulted basement' },
      { topKm: 30,  botKm: 80,  intensity: 0.50, label: 'Transitional mantle' },
      { topKm: 80,  botKm: 200, intensity: 0.40, label: 'Asthenosphere' },
    ],
    note: 'The eastern boundary of Basin & Range extension. Active normal faulting; geothermal fluids circulate in the fault damage zone.',
  },
  'Connecticut Valley Rift': {
    signature: 'Mesozoic basin + deep mantle anomaly',
    layers: [
      { topKm: 0,   botKm: 3,   intensity: 0.55, label: 'Triassic redbeds + traprock' },
      { topKm: 3,   botKm: 15,  intensity: 0.45, label: 'Folded basement' },
      { topKm: 15,  botKm: 40,  intensity: 0.40, label: 'Stable crystalline crust' },
      { topKm: 40,  botKm: 80,  intensity: 0.55, label: 'Mantle lithosphere' },
      { topKm: 80,  botKm: 180, intensity: 0.75, label: 'N. Appalachian Anomaly · volatiles' },
    ],
    note: 'A Mesozoic rift basin (the surface story: Mt. Toby traprock, Brattleboro\u2019s valley) sitting above a deep, mysterious mantle anomaly that nobody fully understands.',
  },
};

// Find sacred sites within ~250 km of a POI (rough degree-distance)
function nearbySites(poi, sites, maxDeg = 2.5) {
  const cosLat = Math.cos(poi.lat * Math.PI / 180);
  return sites
    .map(s => {
      const dlat = s.lat - poi.lat;
      const dlng = (s.lng - poi.lng) * cosLat;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      return { ...s, dist };
    })
    .filter(s => s.dist <= maxDeg)
    .sort((a, b) => a.dist - b.dist);
}

const MOHO_KM = 38; // illustrative continental average

const CONUS = [
  [-124.7,48.4],[-124.0,46.5],[-124.0,42.0],[-124.4,40.4],
  [-122.5,37.5],[-121.5,36.0],[-120.0,34.5],[-118.5,34.0],
  [-117.3,32.7],[-114.7,32.7],[-111.0,31.3],[-108.2,31.3],
  [-106.5,31.8],[-104.5,30.3],[-102.5,29.9],[-100.0,28.5],
  [-99.1,26.4],[-97.4,25.9],[-97.2,27.8],[-94.8,29.7],
  [-91.3,29.4],[-89.6,30.2],[-88.0,30.2],[-87.5,30.4],
  [-84.0,30.0],[-83.0,29.0],[-82.7,27.5],[-82.0,26.7],
  [-81.0,25.2],[-80.1,25.4],[-80.0,27.0],[-81.5,30.7],
  [-79.8,32.8],[-77.9,34.2],[-75.5,35.3],[-76.0,37.0],
  [-75.1,38.5],[-74.0,40.5],[-72.0,41.2],[-71.0,41.6],
  [-70.0,42.0],[-70.6,43.0],[-67.0,44.7],[-67.8,45.7],
  [-69.0,47.4],[-71.5,45.0],[-74.7,45.0],[-76.8,44.0],
  [-79.0,43.5],[-83.0,42.0],[-83.5,46.0],[-89.0,48.0],
  [-94.0,49.0],[-95.2,49.0],[-123.0,49.0],[-124.7,48.4]
];

function fieldAt(lat, lng) {
  let v = 0;
  const cosLat = Math.cos(lat * Math.PI / 180);
  for (const a of ANOMALIES) {
    const dlat = lat - a.lat;
    const dlng = (lng - a.lng) * cosLat;
    const d2 = dlat * dlat + dlng * dlng;
    v += a.amp * Math.exp(-d2 / (2 * a.sigma * a.sigma));
  }
  return Math.min(v / 1.5, 1);
}

// 2D spatial sum of resistor centers — mirrors fieldAt. Used for the main-map
// topo lines. Normalization divisor matched to the conductor field so the
// two contour systems read at comparable visual densities.
function resistorFieldAt(lat, lng) {
  let v = 0;
  const cosLat = Math.cos(lat * Math.PI / 180);
  for (const r of RESISTORS) {
    const dlat = lat - r.lat;
    const dlng = (lng - r.lng) * cosLat;
    const d2 = dlat * dlat + dlng * dlng;
    v += r.amp * Math.exp(-d2 / (2 * r.sigma * r.sigma));
  }
  return Math.min(v / 1.5, 1);
}

// For each anomaly, find the closest named POI; use its depth profile.
// Memoized per anomaly so we never recompute during render.
const ANOMALY_PROFILES = ANOMALIES.map(a => {
  let best = null;
  let bestD = Infinity;
  const cosLat = Math.cos(a.lat * Math.PI / 180);
  for (const p of GEO_POI) {
    const dlat = a.lat - p.lat;
    const dlng = (a.lng - p.lng) * cosLat;
    const d = dlat * dlat + dlng * dlng;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? DEPTH_PROFILES[best.label] || null : null;
});

function intensityAtDepth(profile, km) {
  if (!profile) return 0.35; // soft background for unprofiled anomalies
  const layer = profile.layers.find(l => km >= l.topKm && km <= l.botKm);
  return layer ? layer.intensity : 0.3;
}

// ─── Precomputed contour-depth table ────────────────────────────────────────
// Stores, for every grid point on a fine geographic grid, the depth at which
// the conductive zone bottoms out (or a sky-value if no conductive zone exists
// at that point). Built once, sampled cheaply via bilinear interpolation, so
// the live cursor preview never has to redo the heavy 3D field computation.

const CONTOUR_LAT_MIN = 24;
const CONTOUR_LAT_MAX = 50;
const CONTOUR_LNG_MIN = -126;
const CONTOUR_LNG_MAX = -64;
const CONTOUR_STEP = 0.3; // degrees ≈ 33 km
const CONTOUR_LAT_N = Math.round((CONTOUR_LAT_MAX - CONTOUR_LAT_MIN) / CONTOUR_STEP) + 1;
const CONTOUR_LNG_N = Math.round((CONTOUR_LNG_MAX - CONTOUR_LNG_MIN) / CONTOUR_STEP) + 1;

const CONTOUR_THRESHOLD = 0.32;
const CONTOUR_MAX_DEPTH = 200;
const CONTOUR_SKY = 80;

// Per-anomaly depth-intensity lookup: avoids Array.find inside the hot loop
const ANOMALY_DEPTH_LUT = (() => {
  const stride = CONTOUR_MAX_DEPTH + 1;
  const lut = new Float32Array(ANOMALIES.length * stride);
  for (let i = 0; i < ANOMALIES.length; i++) {
    const profile = ANOMALY_PROFILES[i];
    for (let d = 0; d <= CONTOUR_MAX_DEPTH; d++) {
      lut[i * stride + d] = intensityAtDepth(profile, d);
    }
  }
  return lut;
})();

// Compute the table incrementally. Calls onProgress(0..1) and onDone(table)
// without ever blocking the main thread for more than a frame budget.
function computeContourTableAsync({ onProgress, onDone }) {
  const data = new Int16Array(CONTOUR_LAT_N * CONTOUR_LNG_N);
  const stride = CONTOUR_MAX_DEPTH + 1;
  let i = 0;

  function batch() {
    const start = performance.now();
    while (i < CONTOUR_LAT_N && performance.now() - start < 12) {
      const lat = CONTOUR_LAT_MIN + i * CONTOUR_STEP;
      const cosLat = Math.cos(lat * Math.PI / 180);
      for (let j = 0; j < CONTOUR_LNG_N; j++) {
        const lng = CONTOUR_LNG_MIN + j * CONTOUR_STEP;

        let vMax = 0;
        let deepest = -1;
        // Sweep depth in 4-km steps (51 samples). Plenty for contour resolution.
        for (let d = 0; d <= CONTOUR_MAX_DEPTH; d += 4) {
          let v = 0;
          for (let k = 0; k < ANOMALIES.length; k++) {
            const a = ANOMALIES[k];
            const dlat = lat - a.lat;
            const dlng = (lng - a.lng) * cosLat;
            const d2 = dlat * dlat + dlng * dlng;
            const spatial = a.amp * Math.exp(-d2 / (2 * a.sigma * a.sigma));
            if (spatial < 0.005) continue;
            v += spatial * ANOMALY_DEPTH_LUT[k * stride + d];
          }
          v = v / 1.4;
          if (v > 1) v = 1;
          if (v > vMax) vMax = v;
          if (v >= CONTOUR_THRESHOLD) deepest = d;
        }

        let depth;
        if (deepest >= 0) {
          depth = deepest;
        } else {
          depth = -10 - (CONTOUR_THRESHOLD - vMax) * 220;
          if (depth < -CONTOUR_SKY + 6) depth = -CONTOUR_SKY + 6;
        }
        data[i * CONTOUR_LNG_N + j] = Math.round(depth);
      }
      i++;
    }

    if (i >= CONTOUR_LAT_N) {
      onDone(data);
    } else {
      onProgress(i / CONTOUR_LAT_N);
      requestAnimationFrame(batch);
    }
  }

  requestAnimationFrame(batch);
}

// Bilinear sample of contour depth at any (lat, lng). Returns sky if outside.
function sampleContour(table, lat, lng) {
  if (!table) return -CONTOUR_SKY / 2;
  const fi = (lat - CONTOUR_LAT_MIN) / CONTOUR_STEP;
  const fj = (lng - CONTOUR_LNG_MIN) / CONTOUR_STEP;
  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  const i1 = i0 + 1;
  const j1 = j0 + 1;
  if (i0 < 0 || i1 >= CONTOUR_LAT_N || j0 < 0 || j1 >= CONTOUR_LNG_N) {
    return -CONTOUR_SKY / 2;
  }
  const ti = fi - i0;
  const tj = fj - j0;
  const v00 = table[i0 * CONTOUR_LNG_N + j0];
  const v01 = table[i0 * CONTOUR_LNG_N + j1];
  const v10 = table[i1 * CONTOUR_LNG_N + j0];
  const v11 = table[i1 * CONTOUR_LNG_N + j1];
  return v00 * (1 - ti) * (1 - tj)
       + v01 * (1 - ti) * tj
       + v10 * ti * (1 - tj)
       + v11 * ti * tj;
}

// Classify contour points into solid (real conductive zone exists) and dashed
// (clamped to surface — no real zone) segments. Where the line transitions
// from one regime to the other, insert a midpoint at the surface so the two
// path sets meet visually.
function buildContourSegments(points) {
  const segments = [];
  if (!points || points.length === 0) return segments;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const aReal = a.depth >= 0;
    const bReal = b.depth >= 0;
    const aDepth = aReal ? a.depth : 0;
    const bDepth = bReal ? b.depth : 0;
    if (aReal === bReal) {
      segments.push({
        type: aReal ? 'solid' : 'dashed',
        from: { off: a.off, depth: aDepth },
        to:   { off: b.off, depth: bDepth },
      });
    } else {
      const midOff = (a.off + b.off) / 2;
      const mid = { off: midOff, depth: 0 };
      if (aReal) {
        segments.push({ type: 'solid',  from: { off: a.off, depth: aDepth }, to: mid });
        segments.push({ type: 'dashed', from: mid, to: { off: b.off, depth: 0 } });
      } else {
        segments.push({ type: 'dashed', from: { off: a.off, depth: 0 }, to: mid });
        segments.push({ type: 'solid',  from: mid, to: { off: b.off, depth: bDepth } });
      }
    }
  }
  return segments;
}

// Depth-intensity LUT for the resistor (single shared profile, so a flat
// Float32Array indexed by depth in km — no per-center dimension needed).
const RESISTOR_DEPTH_LUT = (() => {
  const lut = new Float32Array(CONTOUR_MAX_DEPTH + 1);
  for (let d = 0; d <= CONTOUR_MAX_DEPTH; d++) {
    lut[d] = intensityAtDepthResistor(d);
  }
  return lut;
})();

// Same incremental-rAF pattern as computeContourTableAsync, but stores the
// SHALLOWEST depth at which the 3D resistor field exceeds threshold (mirror
// of "deepest" for the conductor). When no resistive zone exists at a grid
// cell, store CONTOUR_MAX_DEPTH + 30 so the segment builder treats it as
// "no zone" and draws the line dashed at the chart floor.
function computeResistorTableAsync({ onProgress, onDone }) {
  const data = new Int16Array(CONTOUR_LAT_N * CONTOUR_LNG_N);
  const NO_ZONE = CONTOUR_MAX_DEPTH + 30;
  let i = 0;

  function batch() {
    const start = performance.now();
    while (i < CONTOUR_LAT_N && performance.now() - start < 12) {
      const lat = CONTOUR_LAT_MIN + i * CONTOUR_STEP;
      const cosLat = Math.cos(lat * Math.PI / 180);
      for (let j = 0; j < CONTOUR_LNG_N; j++) {
        const lng = CONTOUR_LNG_MIN + j * CONTOUR_STEP;

        let shallowest = -1;
        // Sweep depth in 4-km steps and record the FIRST depth at/above
        // threshold (top of zone, not bottom).
        for (let d = 0; d <= CONTOUR_MAX_DEPTH; d += 4) {
          let v = 0;
          for (let k = 0; k < RESISTORS.length; k++) {
            const r = RESISTORS[k];
            const dlat = lat - r.lat;
            const dlng = (lng - r.lng) * cosLat;
            const d2 = dlat * dlat + dlng * dlng;
            const spatial = r.amp * Math.exp(-d2 / (2 * r.sigma * r.sigma));
            if (spatial < 0.005) continue;
            v += spatial * RESISTOR_DEPTH_LUT[d];
          }
          v = v / 1.4;
          if (v > 1) v = 1;
          if (v >= CONTOUR_THRESHOLD) { shallowest = d; break; }
        }

        data[i * CONTOUR_LNG_N + j] = shallowest >= 0 ? shallowest : NO_ZONE;
      }
      i++;
    }

    if (i >= CONTOUR_LAT_N) {
      onDone(data);
    } else {
      onProgress(i / CONTOUR_LAT_N);
      requestAnimationFrame(batch);
    }
  }

  requestAnimationFrame(batch);
}

// Bilinear sample, identical pattern to sampleContour. Returns NO_ZONE
// (CONTOUR_MAX_DEPTH + 30) outside the grid so callers always see "no zone".
function sampleResistor(table, lat, lng) {
  const NO_ZONE = CONTOUR_MAX_DEPTH + 30;
  if (!table) return NO_ZONE;
  const fi = (lat - CONTOUR_LAT_MIN) / CONTOUR_STEP;
  const fj = (lng - CONTOUR_LNG_MIN) / CONTOUR_STEP;
  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  const i1 = i0 + 1;
  const j1 = j0 + 1;
  if (i0 < 0 || i1 >= CONTOUR_LAT_N || j0 < 0 || j1 >= CONTOUR_LNG_N) {
    return NO_ZONE;
  }
  const ti = fi - i0;
  const tj = fj - j0;
  const v00 = table[i0 * CONTOUR_LNG_N + j0];
  const v01 = table[i0 * CONTOUR_LNG_N + j1];
  const v10 = table[i1 * CONTOUR_LNG_N + j0];
  const v11 = table[i1 * CONTOUR_LNG_N + j1];
  return v00 * (1 - ti) * (1 - tj)
       + v01 * (1 - ti) * tj
       + v10 * ti * (1 - tj)
       + v11 * ti * tj;
}

// Mirror of buildContourSegments, but with the chart FLOOR as the boundary
// instead of the surface. Solid where a resistive zone exists at real depth,
// dashed riding the floor where not. The transition midpoint sits at the
// floor so the two path sets meet visually.
function buildResistorSegments(points, floorKm) {
  const segments = [];
  if (!points || points.length === 0) return segments;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const aReal = a.depth <= floorKm;
    const bReal = b.depth <= floorKm;
    const aDepth = aReal ? a.depth : floorKm;
    const bDepth = bReal ? b.depth : floorKm;
    if (aReal === bReal) {
      segments.push({
        type: aReal ? 'solid' : 'dashed',
        from: { off: a.off, depth: aDepth },
        to:   { off: b.off, depth: bDepth },
      });
    } else {
      const midOff = (a.off + b.off) / 2;
      const mid = { off: midOff, depth: floorKm };
      if (aReal) {
        segments.push({ type: 'solid',  from: { off: a.off, depth: aDepth }, to: mid });
        segments.push({ type: 'dashed', from: mid, to: { off: b.off, depth: floorKm } });
      } else {
        segments.push({ type: 'dashed', from: { off: a.off, depth: floorKm }, to: mid });
        segments.push({ type: 'solid',  from: mid, to: { off: b.off, depth: bDepth } });
      }
    }
  }
  return segments;
}

// Build a single SVG fill path describing the resistor BODY: a polygon per
// contiguous "real" run, top edge tracing the top-of-zone curve, bottom edge
// pinned to floorKm. Where the resistor doesn't exist, no polygon is emitted.
// (For the current profile, the resistor's modeled bottom is always at or
// below floorKm, so the band visually anchors to the floor rather than
// resolving a separate bottom-of-zone curve.)
function buildBandPath(points, floorKm, xKmToPx, depthToPx) {
  if (!points || points.length === 0) return '';
  let d = '';
  let runStart = -1;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const real = points[i].depth <= floorKm;
    if (real && runStart < 0) runStart = i;
    const flush = (!real && runStart >= 0) || (real && runStart >= 0 && i === n - 1);
    if (flush) {
      const end = real ? i : i - 1;
      if (end > runStart) {
        let poly = '';
        for (let j = runStart; j <= end; j++) {
          const x = xKmToPx(points[j].off).toFixed(1);
          const y = depthToPx(points[j].depth).toFixed(1);
          poly += (j === runStart ? 'M' : 'L') + x + ',' + y;
        }
        const yFloor = depthToPx(floorKm).toFixed(1);
        const xRight = xKmToPx(points[end].off).toFixed(1);
        const xLeft = xKmToPx(points[runStart].off).toFixed(1);
        poly += 'L' + xRight + ',' + yFloor;
        poly += 'L' + xLeft + ',' + yFloor;
        poly += 'Z';
        d += poly;
      }
      runStart = -1;
    }
  }
  return d;
}

// Rough regional descriptor used to add geographic flavor to the narrative.
// Not exact tectonic provinces — just enough variation so two quiet sites
// in different parts of the country don't read identically.
function regionFor(lat, lng) {
  if (lng < -119 && lat >= 40)   return 'the Pacific Northwest';
  if (lng < -119)                return 'coastal California';
  if (lng < -114 && lat >= 37)   return 'the Great Basin';
  if (lng < -114)                return 'the Mojave / desert Southwest';
  if (lng < -109 && lat >= 41)   return 'the Northern Rockies';
  if (lng < -109)                return 'the Colorado Plateau';
  if (lng < -103 && lat >= 41)   return 'the Northern Plains';
  if (lng < -103)                return 'the Southern Rockies and high desert';
  if (lng < -97)                 return 'the Great Plains';
  if (lng < -89)                 return 'the heart of the craton';
  if (lng < -82)                 return 'the mid-South';
  if (lat >= 42)                 return 'northern New England';
  if (lat >= 38)                 return 'the Appalachian foothills';
  return 'the Southeast';
}

// Compose a 2–3 sentence per-site narrative from the actual cross-section
// data plus a regional descriptor. Two halves: a conductor sentence (what
// yellow tells us) and a resistor sentence (what cyan tells us). Different
// sites with different signal patterns hit different sentence shapes.
function getSiteNarrative({
  site,
  conductorCenterDepth,    // depth (km) of conductor at site center; 0 if absent
  conductorMaxDepth,        // deepest conductor sample anywhere in swath
  conductorOffsetKm,        // signed km from center where deepest sample occurs
  conductorWidthKm,         // total swath km where conductor is real
  resistorTop,              // top depth (km) of resistor at site center; null if absent
  resistorWidthKm,          // total swath km where resistor is real
  maxDepth,                 // chart floor in km
}) {
  const region = regionFor(site.lat, site.lng);

  // Conductor half
  let cond;
  if (conductorCenterDepth >= 150) {
    const tail = conductorMaxDepth >= maxDepth - 4
      ? `the body continues past the visible 200 km — magma, hot fluids, or partial melt threading from upper crust into the mantle`
      : `the body bottoms out in the lower crust or upper mantle, fed by fluids or melt`;
    cond = `A strong conductor sits directly beneath ${site.name}: the yellow line reaches ${conductorCenterDepth} km deep, and ${tail}.`;
  } else if (conductorCenterDepth >= 30) {
    cond = `A moderate conductor reaches ${conductorCenterDepth} km below the site — shallow enough to live in the crust, not deep enough to tap the mantle directly.`;
  } else if (conductorCenterDepth > 0) {
    cond = `A faint conductor sits ${conductorCenterDepth} km below the site — barely above threshold, mostly hovering near the surface.`;
  } else if (conductorWidthKm >= 60) {
    const dir = conductorOffsetKm > 30 ? 'east' : conductorOffsetKm < -30 ? 'west' : 'just off-center';
    cond = `Nothing conductive directly below, but the slice catches a ${conductorWidthKm}-km stretch of conductive crust ${dir} of the site — yellow dips to ${Math.round(conductorMaxDepth)} km at its peak.`;
  } else if (conductorWidthKm > 0) {
    cond = `Almost no conductor in this 400-km slice — a sliver grazes the swath edge, but the rock right below ${site.name} is electrically quiet.`;
  } else {
    cond = `Nothing conductive anywhere in this 400-km slice — quiet, old rock typical of ${region}.`;
  }

  // Resistor half
  let res;
  if (resistorTop !== null && resistorTop <= 12) {
    res = `Cyan fills the column: ${site.name} sits squarely on the Piedmont Resistor, a Pangaea-era slab of frozen igneous basement whose top edge is just ${resistorTop} km below the surface.`;
  } else if (resistorTop !== null && resistorTop <= 40) {
    res = `The cyan band starts ${resistorTop} km down — you're inside the Piedmont Resistor, but near its margin where the slab top dips below the upper crust.`;
  } else if (resistorTop !== null) {
    res = `The cyan band only kicks in at ${resistorTop} km below the surface — you're at the deep edge of the Piedmont Resistor.`;
  } else if (resistorWidthKm > 50) {
    res = `No resistor below the site itself, but cyan brackets the swath on one side — you're just outside the Piedmont Resistor's main body.`;
  } else if (resistorWidthKm > 0) {
    res = `A trace of resistor on the swath edge — Piedmont rock is somewhere east of here, but not under ${site.name}.`;
  } else {
    res = `No Pangaea-era slab below — the resistor is an East Coast feature, and ${site.name} is in ${region}.`;
  }

  return cond + ' ' + res;
}

function segmentsToPaths(segments, xKmToPx, depthToPx) {
  let solidD = '';
  let dashedD = '';
  let lastType = null;
  for (const s of segments) {
    const fx = xKmToPx(s.from.off);
    const fy = depthToPx(s.from.depth);
    const tx = xKmToPx(s.to.off);
    const ty = depthToPx(s.to.depth);
    if (s.type === 'solid') {
      if (lastType !== 'solid') solidD += `M${fx.toFixed(1)},${fy.toFixed(1)}`;
      solidD += ` L${tx.toFixed(1)},${ty.toFixed(1)}`;
    } else {
      if (lastType !== 'dashed') dashedD += `M${fx.toFixed(1)},${fy.toFixed(1)}`;
      dashedD += ` L${tx.toFixed(1)},${ty.toFixed(1)}`;
    }
    lastType = s.type;
  }
  return { solidD, dashedD };
}

// ─── Compact cross-section view (used in the live cursor preview) ──────────

const MINI_LAYERS = {
  surfaceBot: 3,
  moho: 38,
  lab: 100,
};

function MiniCrossSection({ table, resistorTable, lat, lng, axis }) {
  const HALF_KM = 200;
  const SKY = CONTOUR_SKY;
  // The contour line itself maxes out at CONTOUR_MAX_DEPTH (200km), but we
  // extend the visible depth axis so there's room below the deepest excursion
  // and the asthenosphere band has air to breathe.
  const MAX = 300;
  const N = 80;

  // Sample the conductor line through (lat, lng) along the chosen axis
  const points = useMemo(() => {
    if (!table || lat == null || lng == null) return null;
    const cosLat = Math.cos(lat * Math.PI / 180);
    const arr = new Array(N);
    for (let i = 0; i < N; i++) {
      const off = -HALF_KM + (i / (N - 1)) * 2 * HALF_KM;
      let sLat, sLng;
      if (axis === 'ew') {
        sLat = lat;
        sLng = lng + off / (111 * cosLat);
      } else {
        sLat = lat + off / 111;
        sLng = lng;
      }
      arr[i] = { off, depth: sampleContour(table, sLat, sLng) };
    }
    return arr;
  }, [table, lat, lng, axis]);

  // Parallel sample for the resistor line, same offsets.
  const resistorPoints = useMemo(() => {
    if (!resistorTable || lat == null || lng == null) return null;
    const cosLat = Math.cos(lat * Math.PI / 180);
    const arr = new Array(N);
    for (let i = 0; i < N; i++) {
      const off = -HALF_KM + (i / (N - 1)) * 2 * HALF_KM;
      let sLat, sLng;
      if (axis === 'ew') {
        sLat = lat;
        sLng = lng + off / (111 * cosLat);
      } else {
        sLat = lat + off / 111;
        sLng = lng;
      }
      arr[i] = { off, depth: sampleResistor(resistorTable, sLat, sLng) };
    }
    return arr;
  }, [resistorTable, lat, lng, axis]);

  // Geometry
  const W = 360;
  const H = 240;
  const PAD_LEFT = 28;
  const PAD_RIGHT = 6;
  const PAD_TOP = 8;
  const PAD_BOT = 18;
  const cw = W - PAD_LEFT - PAD_RIGHT;
  const ch = H - PAD_TOP - PAD_BOT;
  const Y_SPAN = MAX + SKY;

  const xKmToPx = (km) => PAD_LEFT + ((km + HALF_KM) / (2 * HALF_KM)) * cw;
  const depthToPx = (km) => PAD_TOP + ((km + SKY) / Y_SPAN) * ch;

  const surfaceY = depthToPx(0);
  const surfaceBotY = depthToPx(MINI_LAYERS.surfaceBot);
  const mohoY = depthToPx(MINI_LAYERS.moho);
  const labY = depthToPx(MINI_LAYERS.lab);
  const bottomY = depthToPx(MAX);

  const { solidD, dashedD } = useMemo(() => {
    if (!points) return { solidD: '', dashedD: '' };
    const segs = buildContourSegments(points);
    return segmentsToPaths(segs, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const { solidD: resistSolidD, dashedD: resistDashedD } = useMemo(() => {
    if (!resistorPoints) return { solidD: '', dashedD: '' };
    const segs = buildResistorSegments(resistorPoints, CONTOUR_MAX_DEPTH);
    return segmentsToPaths(segs, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resistorPoints]);

  const resistBandD = useMemo(() => {
    if (!resistorPoints) return '';
    return buildBandPath(resistorPoints, CONTOUR_MAX_DEPTH, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resistorPoints]);

  const axisLabel = axis === 'ew' ? 'WEST ↔ EAST' : 'SOUTH ↔ NORTH';

  return (
    <div className="bg-stone-950/60 ring-1 ring-stone-800/60 rounded p-2.5 sm:p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] tracking-[0.22em] text-amber-300/70">
          {axisLabel}
        </span>
        <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] text-stone-600 tabular-nums">
          ±200 km
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`miniSky-${axis}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id={`miniSurface-${axis}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d6e3a" />
            <stop offset="100%" stopColor="#264a23" />
          </linearGradient>
          <linearGradient id={`miniCrust-${axis}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b6a40" />
            <stop offset="100%" stopColor="#3d2810" />
          </linearGradient>
          <linearGradient id={`miniMantle-${axis}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a2820" />
            <stop offset="100%" stopColor="#4a1208" />
          </linearGradient>
          <linearGradient id={`miniAstheno-${axis}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b1f08" />
            <stop offset="50%" stopColor="#c95a20" />
            <stop offset="100%" stopColor="#f4d4a8" />
          </linearGradient>
        </defs>

        <rect x={PAD_LEFT} y={PAD_TOP} width={cw} height={surfaceY - PAD_TOP} fill={`url(#miniSky-${axis})`} />
        <rect x={PAD_LEFT} y={surfaceY} width={cw} height={surfaceBotY - surfaceY} fill={`url(#miniSurface-${axis})`} />
        <rect x={PAD_LEFT} y={surfaceBotY} width={cw} height={mohoY - surfaceBotY} fill={`url(#miniCrust-${axis})`} />
        <rect x={PAD_LEFT} y={mohoY} width={cw} height={labY - mohoY} fill={`url(#miniMantle-${axis})`} />
        <rect x={PAD_LEFT} y={labY} width={cw} height={bottomY - labY} fill={`url(#miniAstheno-${axis})`} />

        <line x1={PAD_LEFT} y1={surfaceY} x2={PAD_LEFT + cw} y2={surfaceY} stroke="#000" strokeOpacity="0.55" strokeWidth="0.6" />
        <line x1={PAD_LEFT} y1={mohoY} x2={PAD_LEFT + cw} y2={mohoY} stroke="#000" strokeOpacity="0.5" strokeWidth="0.5" strokeDasharray="2 3" />
        <line x1={PAD_LEFT} y1={labY} x2={PAD_LEFT + cw} y2={labY} stroke="#000" strokeOpacity="0.35" strokeWidth="0.4" strokeDasharray="1 3" />

        {/* Resistor body — soft cyan band from top-of-zone down to the
            data floor (CONTOUR_MAX_DEPTH = 200 km). The band IS the depth
            extent of the body. */}
        {resistBandD && (
          <path d={resistBandD} fill="#7dd3fc" fillOpacity="0.12" stroke="none" />
        )}
        {/* Top edge of the resistor — same weight as the yellow line. */}
        {resistSolidD && (
          <>
            <path d={resistSolidD} fill="none" stroke="#bae6fd" strokeOpacity="0.45" strokeWidth="4"
              strokeLinejoin="round" strokeLinecap="round" filter="blur(1.5px)" />
            <path d={resistSolidD} fill="none" stroke="#7dd3fc" strokeOpacity="0.95" strokeWidth="1.6"
              strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {/* No-resistor stretches — dashed line at the data floor. */}
        {resistDashedD && (
          <path d={resistDashedD} fill="none" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.4"
            strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3 3" />
        )}

        {/* Conductor line — solid where conductive zone is real, dashed at
            surface where it isn't */}
        {solidD && (
          <>
            <path d={solidD} fill="none" stroke="#e8eb3f" strokeOpacity="0.5" strokeWidth="4"
              strokeLinejoin="round" strokeLinecap="round" filter="blur(1.5px)" />
            <path d={solidD} fill="none" stroke="#f4f76f" strokeOpacity="0.95" strokeWidth="1.6"
              strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {dashedD && (
          <path d={dashedD} fill="none" stroke="#f4f76f" strokeOpacity="0.55" strokeWidth="1.4"
            strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3 3" />
        )}

        {/* Center site marker */}
        <line
          x1={xKmToPx(0)} y1={PAD_TOP}
          x2={xKmToPx(0)} y2={bottomY}
          stroke="#fef9e7"
          strokeOpacity="0.7"
          strokeWidth="0.8"
          strokeDasharray="4 2 1 2"
        />

        {/* Depth axis ticks */}
        {[0, 100, 200, 300].map(km => (
          <text key={km}
            x={PAD_LEFT - 4}
            y={depthToPx(km) + 3}
            textAnchor="end"
            style={{fontFamily:'JetBrains Mono, monospace', fontSize:'8px', fill:'#9ca3af'}}
          >{km}</text>
        ))}

        {/* Layer name labels — anchored to the right edge of each band */}
        <g style={{fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em'}}>
          <text
            x={PAD_LEFT + cw - 5}
            y={(surfaceBotY + mohoY) / 2 + 3}
            textAnchor="end"
            style={{fontSize:'8px', fill:'#fed7aa', fillOpacity:0.78}}
          >CRUST</text>
          <text
            x={PAD_LEFT + cw - 5}
            y={(mohoY + labY) / 2 + 3}
            textAnchor="end"
            style={{fontSize:'8px', fill:'#fecaca', fillOpacity:0.78}}
          >LITHOSPHERIC MANTLE</text>
          <text
            x={PAD_LEFT + cw - 5}
            y={(labY + bottomY) / 2 + 3}
            textAnchor="end"
            style={{fontSize:'8px', fill:'#fef3c7', fillOpacity:0.85}}
          >ASTHENOSPHERE</text>
        </g>

        {/* Boundary labels — pinned just above the Moho and LAB dashed lines */}
        <g style={{fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.16em'}}>
          <text
            x={PAD_LEFT + 4}
            y={mohoY - 2.5}
            style={{fontSize:'7px', fill:'#0a0a0a', fillOpacity:0.7}}
          >── MOHO · 38 KM</text>
          <text
            x={PAD_LEFT + 4}
            y={labY - 2.5}
            style={{fontSize:'7px', fill:'#fef3c7', fillOpacity:0.55}}
          >── LAB · 100 KM</text>
        </g>

        {/* "km depth" axis caption, bottom-left */}
        <text
          x={PAD_LEFT - 4}
          y={H - 4}
          textAnchor="end"
          style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7px', fill:'#6b6258', letterSpacing:'0.12em'}}
        >KM</text>
      </svg>
    </div>
  );
}


// Earth-cutaway cross-section drawer: 400-km east-west slice with real geologic
// layers and a yellow contour line tracing the bottom of the conductive zone.
function SiteCrossSectionDrawer({ site, onClose }) {
  // Horizontal zoom: 1× = 400 km swath, 2× = 200 km, 4× = 100 km. Affects the
  // horizontal axis only; depth stays 0–200 km. Zooming re-runs the contour
  // useMemo with a tighter halfKm, so 121 samples now span the smaller range
  // (i.e. higher horizontal resolution near the site).
  const ZOOM_LEVELS = [1, 2, 4];
  const [zoomLevel, setZoomLevel] = useState(1);
  const halfKm = 200 / zoomLevel; // ± km from site along the cross-section line
  const HALF_KM = halfKm;          // kept as an alias so existing references read cleanly

  const MAX_DEPTH = 200;          // visible depth in km
  const SKY_KM = 80;              // visible negative-depth (sky) range
  const T = 0.32;                 // conductivity threshold for "conductive zone"

  // Real geologic depths (km below surface)
  const SURFACE_BOT = 3;
  const MOHO = 38;
  const LAB = 100;

  // Sample conductivity along the cross-section line, find contour depth at
  // each x. Also sample the resistor field at the same x-positions so the
  // two lines share a coordinate grid and read as one paired story.
  const { contour, resistorContour } = useMemo(() => {
    const cosLat = Math.cos(site.lat * Math.PI / 180);
    const N = 121; // ≈ 3.3 km per sample
    const out = [];
    const resistorOut = [];
    const NO_ZONE = MAX_DEPTH + 30;

    for (let i = 0; i < N; i++) {
      const xKm = -HALF_KM + (i / (N - 1)) * 2 * HALF_KM;
      const lng = site.lng + xKm / (111 * cosLat);
      const lat = site.lat;

      // Walk down in 1-km steps; track v_max, deepest conductor sample, and
      // shallowest resistor sample in the same loop.
      let vMax = 0;
      let deepestAboveT = -1;
      let shallowestResist = -1;
      for (let d = 0; d <= MAX_DEPTH; d += 1) {
        // Conductor
        let v = 0;
        for (let j = 0; j < ANOMALIES.length; j++) {
          const a = ANOMALIES[j];
          const dlat = lat - a.lat;
          const dlng = (lng - a.lng) * cosLat;
          const d2 = dlat * dlat + dlng * dlng;
          const spatial = a.amp * Math.exp(-d2 / (2 * a.sigma * a.sigma));
          if (spatial < 0.005) continue;
          v += spatial * intensityAtDepth(ANOMALY_PROFILES[j], d);
        }
        v = Math.min(v / 1.4, 1);
        if (v > vMax) vMax = v;
        if (v >= T) deepestAboveT = d;

        // Resistor (track shallowest only — once found, we still finish the
        // loop because tracking deepest conductor needs to keep running)
        if (shallowestResist < 0) {
          let vr = 0;
          for (let k = 0; k < RESISTORS.length; k++) {
            const r = RESISTORS[k];
            const dlat = lat - r.lat;
            const dlng = (lng - r.lng) * cosLat;
            const d2 = dlat * dlat + dlng * dlng;
            const spatial = r.amp * Math.exp(-d2 / (2 * r.sigma * r.sigma));
            if (spatial < 0.005) continue;
            vr += spatial * intensityAtDepthResistor(d);
          }
          vr = Math.min(vr / 1.4, 1);
          if (vr >= T) shallowestResist = d;
        }
      }

      // Conductor: if zone exists, line sits at its bottom. If not, line
      // floats into sky proportional to how far below threshold v_max is.
      let depth;
      if (deepestAboveT >= 0) {
        depth = deepestAboveT;
      } else {
        depth = -10 - (T - vMax) * 220;
        if (depth < -SKY_KM + 6) depth = -SKY_KM + 6;
      }
      out.push({ xKm, depth });

      // Resistor: if zone exists, line sits at its top. If not, sentinel
      // value past the chart floor so the segment builder draws it dashed.
      resistorOut.push({
        xKm,
        depth: shallowestResist >= 0 ? shallowestResist : NO_ZONE,
      });
    }
    return { contour: out, resistorContour: resistorOut };
  }, [site, halfKm]);

  const siteContourDepth = useMemo(() => {
    const center = contour[Math.floor(contour.length / 2)];
    return Math.max(0, Math.round(center.depth));
  }, [contour]);

  const zoneSurfaceWidth = useMemo(() => {
    let widthKm = 0;
    for (const p of contour) {
      if (p.depth >= 0) widthKm += (2 * HALF_KM) / (contour.length - 1);
    }
    return Math.round(widthKm);
  }, [contour, HALF_KM]);

  // Inputs for the per-site narrative. Beyond the two existing stats above,
  // we also need the deepest conductor sample anywhere in the swath and
  // where it occurs, plus the resistor's situation under the site.
  const narrative = useMemo(() => {
    let conductorMaxDepth = 0;
    let conductorOffsetKm = 0;
    for (const p of contour) {
      if (p.depth > conductorMaxDepth) {
        conductorMaxDepth = p.depth;
        conductorOffsetKm = p.xKm;
      }
    }
    const resCenter = resistorContour[Math.floor(resistorContour.length / 2)];
    const resistorTop = resCenter.depth <= MAX_DEPTH ? Math.round(resCenter.depth) : null;
    let resistorWidthKm = 0;
    for (const p of resistorContour) {
      if (p.depth <= MAX_DEPTH) resistorWidthKm += (2 * HALF_KM) / (resistorContour.length - 1);
    }
    return getSiteNarrative({
      site,
      conductorCenterDepth: siteContourDepth,
      conductorMaxDepth: Math.max(0, conductorMaxDepth),
      conductorOffsetKm,
      conductorWidthKm: zoneSurfaceWidth,
      resistorTop,
      resistorWidthKm: Math.round(resistorWidthKm),
      maxDepth: MAX_DEPTH,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contour, resistorContour, siteContourDepth, zoneSurfaceWidth, site, HALF_KM]);

  // SVG geometry
  const W = 480;
  const H = 320;
  const PAD_LEFT = 40;
  const PAD_RIGHT = 16;
  const PAD_TOP = 8;
  const PAD_BOT = 28;
  const cw = W - PAD_LEFT - PAD_RIGHT;
  const ch = H - PAD_TOP - PAD_BOT;
  const Y_SPAN = MAX_DEPTH + SKY_KM;

  const xKmToPx = (km) => PAD_LEFT + ((km + HALF_KM) / (2 * HALF_KM)) * cw;
  const depthToPx = (km) => PAD_TOP + ((km + SKY_KM) / Y_SPAN) * ch;

  const surfaceY = depthToPx(0);
  const mohoY = depthToPx(MOHO);
  const labY = depthToPx(LAB);
  const surfaceBotY = depthToPx(SURFACE_BOT);
  const bottomY = depthToPx(MAX_DEPTH);

  const { solidD, dashedD } = useMemo(() => {
    const pts = contour.map(p => ({ off: p.xKm, depth: p.depth }));
    const segs = buildContourSegments(pts);
    return segmentsToPaths(segs, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contour]);

  const { solidD: resistSolidD, dashedD: resistDashedD } = useMemo(() => {
    const pts = resistorContour.map(p => ({ off: p.xKm, depth: p.depth }));
    const segs = buildResistorSegments(pts, MAX_DEPTH);
    return segmentsToPaths(segs, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resistorContour]);

  const resistBandD = useMemo(() => {
    const pts = resistorContour.map(p => ({ off: p.xKm, depth: p.depth }));
    return buildBandPath(pts, MAX_DEPTH, xKmToPx, depthToPx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resistorContour]);

  const layers = [
    { name: 'Surface',             range: '0–3 km',     color: '#3d6e3a' },
    { name: 'Crust',               range: '3–38 km',    color: '#7a5532' },
    { name: 'Lithospheric mantle', range: '38–100 km',  color: '#7a2820' },
    { name: 'Asthenosphere',       range: '100–200 km', color: '#d97a3a' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end backdrop-blur-md bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:w-[520px] sm:max-w-[95vw] bg-black sm:bg-stone-950 ring-1 ring-stone-800 rounded-t-lg sm:rounded-t-none sm:rounded-l-md max-h-[90vh] sm:max-h-none sm:h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{boxShadow: '-30px 0 80px -20px rgba(216,235,58,0.10)'}}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-stone-900 text-stone-400 hover:text-stone-100 z-10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-700" />
        </div>

        <div className="px-5 sm:px-7 py-5 sm:py-8">
          <div className="flex items-center justify-between gap-3 mb-2 mr-7 sm:mr-9">
            <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.3em] text-amber-300/80">
              CROSS-SECTION · {Math.round(2 * HALF_KM)} KM E–W
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const i = ZOOM_LEVELS.indexOf(zoomLevel);
                  if (i > 0) setZoomLevel(ZOOM_LEVELS[i - 1]);
                }}
                disabled={zoomLevel === ZOOM_LEVELS[0]}
                className="p-1.5 rounded ring-1 ring-stone-700/60 text-stone-300 hover:bg-stone-900 hover:text-stone-100 active:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <div
                style={{fontFamily:'JetBrains Mono, monospace'}}
                className="text-[10px] tracking-[0.18em] text-stone-400 tabular-nums w-7 text-center"
              >
                {zoomLevel}×
              </div>
              <button
                onClick={() => {
                  const i = ZOOM_LEVELS.indexOf(zoomLevel);
                  if (i < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[i + 1]);
                }}
                disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                className="p-1.5 rounded ring-1 ring-stone-700/60 text-stone-300 hover:bg-stone-900 hover:text-stone-100 active:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>
          <h2 style={{fontFamily:'Fraunces, serif', fontWeight:300}} className="text-2xl sm:text-3xl leading-tight text-stone-100">
            {site.name}
          </h2>
          <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="mt-1 text-[12.5px] text-stone-400">
            {site.note}
          </div>

          {/* Earth cutaway visualization */}
          <div className="mt-5 -mx-1">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#000" />
                  <stop offset="100%" stopColor="#0a0a0a" />
                </linearGradient>
                <linearGradient id="bgSurface" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3d6e3a" />
                  <stop offset="100%" stopColor="#264a23" />
                </linearGradient>
                <linearGradient id="bgCrust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#8b6a40" />
                  <stop offset="100%" stopColor="#3d2810" />
                </linearGradient>
                <linearGradient id="bgMantle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7a2820" />
                  <stop offset="100%" stopColor="#4a1208" />
                </linearGradient>
                <linearGradient id="bgAstheno" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6b1f08" />
                  <stop offset="50%"  stopColor="#c95a20" />
                  <stop offset="100%" stopColor="#f4d4a8" />
                </linearGradient>
                <filter id="contourGlow" x="-5%" y="-5%" width="110%" height="110%">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>

              {/* Sky */}
              <rect x={PAD_LEFT} y={PAD_TOP} width={cw} height={surfaceY - PAD_TOP} fill="url(#bgSky)" />
              {/* Surface */}
              <rect x={PAD_LEFT} y={surfaceY} width={cw} height={surfaceBotY - surfaceY} fill="url(#bgSurface)" />
              {/* Crust */}
              <rect x={PAD_LEFT} y={surfaceBotY} width={cw} height={mohoY - surfaceBotY} fill="url(#bgCrust)" />
              {/* Lithospheric mantle */}
              <rect x={PAD_LEFT} y={mohoY} width={cw} height={labY - mohoY} fill="url(#bgMantle)" />
              {/* Asthenosphere */}
              <rect x={PAD_LEFT} y={labY} width={cw} height={bottomY - labY} fill="url(#bgAstheno)" />

              {/* Boundary lines */}
              <line x1={PAD_LEFT} y1={surfaceY} x2={PAD_LEFT + cw} y2={surfaceY}
                stroke="#000" strokeOpacity="0.55" strokeWidth="0.8" />
              <line x1={PAD_LEFT} y1={mohoY} x2={PAD_LEFT + cw} y2={mohoY}
                stroke="#000" strokeOpacity="0.5" strokeWidth="0.7" strokeDasharray="2 3" />
              <line x1={PAD_LEFT} y1={labY} x2={PAD_LEFT + cw} y2={labY}
                stroke="#000" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="1 3" />

              {/* Resistor body — soft cyan band from top-of-zone down to
                  the chart floor. The band IS the depth extent of the body. */}
              {resistBandD && (
                <path d={resistBandD} fill="#7dd3fc" fillOpacity="0.13" stroke="none" />
              )}
              {/* Top edge of the resistor — solid where the zone is real.
                  Drawn first so the yellow conductor line sits on top at
                  crossings. */}
              {resistSolidD && (
                <>
                  <path d={resistSolidD} fill="none"
                    stroke="#bae6fd" strokeOpacity="0.50" strokeWidth="6"
                    filter="url(#contourGlow)"
                    strokeLinejoin="round" strokeLinecap="round" />
                  <path d={resistSolidD} fill="none"
                    stroke="#7dd3fc" strokeOpacity="0.95" strokeWidth="2.2"
                    strokeLinejoin="round" strokeLinecap="round" />
                </>
              )}
              {/* No-resistor stretches — dashed at the chart floor. */}
              {resistDashedD && (
                <path d={resistDashedD} fill="none"
                  stroke="#7dd3fc" strokeOpacity="0.60" strokeWidth="1.8"
                  strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray="5 4" />
              )}

              {/* Conductivity contour — solid where the conductive zone is real,
                  dashed at surface where the rock is below threshold */}
              {solidD && (
                <>
                  <path d={solidD} fill="none"
                    stroke="#e8eb3f" strokeOpacity="0.55" strokeWidth="6"
                    filter="url(#contourGlow)"
                    strokeLinejoin="round" strokeLinecap="round" />
                  <path d={solidD} fill="none"
                    stroke="#f4f76f" strokeOpacity="0.98" strokeWidth="2.2"
                    strokeLinejoin="round" strokeLinecap="round" />
                </>
              )}
              {dashedD && (
                <path d={dashedD} fill="none"
                  stroke="#f4f76f" strokeOpacity="0.65" strokeWidth="1.8"
                  strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray="5 4" />
              )}

              {/* Site dashed marker */}
              <line
                x1={xKmToPx(0)} y1={PAD_TOP}
                x2={xKmToPx(0)} y2={bottomY}
                stroke="#fef9e7"
                strokeOpacity="0.85"
                strokeWidth="1.0"
                strokeDasharray="6 3 1 3"
              />

              {/* Site label, sky region */}
              <text
                x={xKmToPx(0)}
                y={PAD_TOP + 24}
                textAnchor="middle"
                style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontSize:'18px', fill:'#fef9e7'}}
              >
                {site.name}
              </text>

              {/* Boundary callouts */}
              <text x={PAD_LEFT + 4} y={mohoY - 3}
                style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7.5px', fill:'#fcd34d', letterSpacing:'0.18em', fillOpacity:0.85}}>
                — MOHO
              </text>
              <text x={PAD_LEFT + 4} y={labY - 3}
                style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7.5px', fill:'#fcd34d', letterSpacing:'0.18em', fillOpacity:0.6}}>
                — LAB
              </text>

              {/* Depth axis labels */}
              {[0, 50, 100, 150, 200].map(km => (
                <text key={km}
                  x={PAD_LEFT - 6}
                  y={depthToPx(km) + 3}
                  textAnchor="end"
                  style={{fontFamily:'JetBrains Mono, monospace', fontSize:'9px', fill:'#9ca3af'}}
                >
                  {km}
                </text>
              ))}
              <text
                x={PAD_LEFT - 6}
                y={depthToPx(-SKY_KM) + 14}
                textAnchor="end"
                style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7.5px', fill:'#6b7280', letterSpacing:'0.18em'}}
              >
                KM
              </text>

              {/* Distance axis — scales with zoom */}
              {(() => {
                const full = Math.round(HALF_KM);
                const half = Math.round(HALF_KM / 2);
                return [
                  { km: -full, label: `−${full} km`, anchor: 'start' },
                  { km: -half, label: `−${half}`,    anchor: 'middle' },
                  { km:     0, label: 'SITE',         anchor: 'middle' },
                  { km:  half, label: `+${half}`,    anchor: 'middle' },
                  { km:  full, label: `+${full} km`, anchor: 'end' },
                ];
              })().map(t => (
                <text key={t.km}
                  x={xKmToPx(t.km)}
                  y={H - 14}
                  textAnchor={t.anchor}
                  style={{
                    fontFamily:'JetBrains Mono, monospace',
                    fontSize:'9px',
                    fill: t.km === 0 ? '#fbbf24' : '#9ca3af',
                    letterSpacing: t.km === 0 ? '0.18em' : 0,
                  }}
                >
                  {t.label}
                </text>
              ))}
              <text x={PAD_LEFT}      y={H - 2} textAnchor="start"
                style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7.5px', fill:'#6b7280', letterSpacing:'0.2em'}}>
                WEST
              </text>
              <text x={PAD_LEFT + cw} y={H - 2} textAnchor="end"
                style={{fontFamily:'JetBrains Mono, monospace', fontSize:'7.5px', fill:'#6b7280', letterSpacing:'0.2em'}}>
                EAST
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {layers.map(l => (
              <div key={l.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{background: l.color}}
                />
                <span style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-300 truncate">
                  {l.name}
                </span>
                <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-stone-500 tabular-nums whitespace-nowrap">
                  {l.range}
                </span>
              </div>
            ))}
            <div className="col-span-2 mt-1 pt-2 border-t border-stone-900 space-y-1.5">
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="flex-shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke="#f4f76f" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-300">
                  Conductive zone — line at its bottom
                </span>
                <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-stone-500">
                  · σ ≥ {Math.round(T * 100)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="flex-shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke="#f4f76f" strokeOpacity="0.65" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" />
                </svg>
                <span style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-400">
                  No conductive zone — riding the surface
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="10" className="flex-shrink-0">
                  <rect x="0" y="0" width="20" height="10" fill="#7dd3fc" fillOpacity="0.18" />
                  <line x1="0" y1="1" x2="20" y2="1" stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-300">
                  Resistive body — band fills its depth extent
                </span>
                <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-stone-500">
                  · ρ ≥ {Math.round(T * 100)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="10" className="flex-shrink-0">
                  <line x1="0" y1="5" x2="20" y2="5" stroke="#7dd3fc" strokeOpacity="0.60" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" />
                </svg>
                <span style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-400">
                  No resistive body — riding the depth floor
                </span>
              </div>
            </div>
          </div>

          {/* Headline metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="bg-stone-950/70 ring-1 ring-stone-800/70 rounded p-3">
              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] tracking-[0.18em] text-stone-500 mb-1">
                ZONE REACHES
              </div>
              <div style={{fontFamily:'Fraunces, serif', fontWeight:300}} className="text-2xl text-amber-200 tabular-nums leading-none">
                {siteContourDepth > 0
                  ? <>{siteContourDepth}<span className="text-[12px] text-stone-500 ml-1">km deep</span></>
                  : <span className="text-stone-600">— <span className="text-[12px]">no zone</span></span>}
              </div>
              <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[10.5px] text-stone-500 italic mt-1">
                directly below site
              </div>
            </div>
            <div className="bg-stone-950/70 ring-1 ring-stone-800/70 rounded p-3">
              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] tracking-[0.18em] text-stone-500 mb-1">
                ZONE WIDTH
              </div>
              <div style={{fontFamily:'Fraunces, serif', fontWeight:300}} className="text-2xl text-amber-200 tabular-nums leading-none">
                {zoneSurfaceWidth > 0
                  ? <>{zoneSurfaceWidth}<span className="text-[12px] text-stone-500 ml-1">km wide</span></>
                  : <span className="text-stone-600">— <span className="text-[12px]">no zone</span></span>}
              </div>
              <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[10.5px] text-stone-500 italic mt-1">
                across the swath
              </div>
            </div>
          </div>

          {/* Reading guide */}
          <div
            style={{fontFamily:'IBM Plex Sans, sans-serif'}}
            className="mt-5 text-[12.5px] text-stone-300 leading-relaxed border-l-2 border-amber-300/30 pl-3"
          >
            {narrative}
          </div>

          <div
            style={{fontFamily:'JetBrains Mono, monospace'}}
            className="mt-6 pt-4 border-t border-stone-800/80 text-[9.5px] tracking-wider text-stone-600 leading-relaxed"
          >
            STYLIZED CROSS-SECTION · DEPTHS SYNTHESIZED FROM USMTARRAY LITERATURE · LAYERS AT REAL CONTINENTAL AVERAGES
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const [w, setW] = useState(960);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [showSites, setShowSites] = useState(true);
  const [showField, setShowField] = useState(true);
  const [showResistors, setShowResistors] = useState(true);
  const [showPOI, setShowPOI] = useState(false);
  const [showStates, setShowStates] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [zoomT, setZoomT] = useState(d3.zoomIdentity);
  const [stateGeo, setStateGeo] = useState(null);

  // Live cursor: geographic point being explored. Updated on hover (desktop)
  // or tap (mobile). The two mini cross-sections sample the precomputed
  // table at this lat/lng. Defaults to Yellowstone so the panel shows
  // something interesting on first render.
  const [cursor, setCursor] = useState({ lat: 44.43, lng: -110.59 });
  const [cursorLocked, setCursorLocked] = useState(false);
  const [showLive, setShowLive] = useState(true);
  const cursorRef = useRef(null);
  const cursorRafRef = useRef(null);

  // Precomputed contour-depth table for fast cross-section sampling
  const [contourTable, setContourTable] = useState(null);
  const [tableProgress, setTableProgress] = useState(0);
  const [resistorTable, setResistorTable] = useState(null);

  useEffect(() => {
    let cancelled = false;
    computeContourTableAsync({
      onProgress: (p) => { if (!cancelled) setTableProgress(p); },
      onDone: (data) => { if (!cancelled) { setContourTable(data); setTableProgress(1); } },
    });
    return () => { cancelled = true; };
  }, []);

  // Build the resistor table after the conductor table is done so the two
  // builds don't compete for frame budget on first paint.
  useEffect(() => {
    if (!contourTable) return;
    let cancelled = false;
    computeResistorTableAsync({
      onProgress: () => {},
      onDone: (data) => { if (!cancelled) setResistorTable(data); },
    });
    return () => { cancelled = true; };
  }, [contourTable]);

  // Fetch US state boundaries once. If the CDN is unreachable, the layer
  // simply stays empty — no errors, no broken UI.
  useEffect(() => {
    let cancelled = false;
    const url = 'https://cdn.jsdelivr.net/gh/python-visualization/folium@master/examples/data/us-states.json';
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && !cancelled) setStateGeo(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const h = Math.round(w * 0.6);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const cw = Math.round(Math.min(1200, Math.max(320, e.contentRect.width)));
        setW(cw);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // d3-zoom: pinch on mobile (2+ fingers), wheel on desktop, drag to pan.
  // Single-finger touches pass through so the page can still scroll.
  useEffect(() => {
    if (!svgRef.current) return;
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [w, h]])
      .extent([[0, 0], [w, h]])
      .filter((event) => {
        if (event.ctrlKey && event.type !== 'wheel') return false;
        if (event.button) return false;
        if (event.type === 'touchstart' && (!event.touches || event.touches.length < 2)) return false;
        return true;
      })
      .on('zoom', (e) => setZoomT(e.transform));
    zoomBehaviorRef.current = zoom;
    const sel = d3.select(svgRef.current);
    sel.call(zoom);
    // Restore transform across resize
    if (zoomT !== d3.zoomIdentity) sel.call(zoom.transform, zoomT);
    return () => { sel.on('.zoom', null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);

  const resetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(450)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const projection = useMemo(() => {
    return d3.geoAlbers()
      .center([0, 39])
      .rotate([96, 0])
      .parallels([29.5, 45.5])
      .scale(w * 1.25)
      .translate([w / 2, h / 2 - 8]);
  }, [w, h]);

  // Sample field on a grid, generate isolines via d3.contours
  const contours = useMemo(() => {
    const gridW = 280;
    const gridH = Math.round(gridW * (h / w));
    const values = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const cx = ((gx + 0.5) / gridW) * w;
        const cy = ((gy + 0.5) / gridH) * h;
        const coord = projection.invert([cx, cy]);
        if (!coord) continue;
        const [lng, lat] = coord;
        if (lat < 23 || lat > 51 || lng < -126 || lng > -65) continue;
        values[gy * gridW + gx] = fieldAt(lat, lng);
      }
    }

    const thresholds = [];
    for (let t = 0.10; t <= 0.94; t += 0.06) thresholds.push(+t.toFixed(2));

    const contourGen = d3.contours()
      .size([gridW, gridH])
      .thresholds(thresholds);

    const features = contourGen(values);
    const sx = w / gridW;
    const sy = h / gridH;

    // Build SVG path strings manually for reliability
    return features.map(f => {
      const d = f.coordinates.map(polygon =>
        polygon.map(ring =>
          'M' + ring.map(([x, y]) =>
            `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`
          ).join('L') + 'Z'
        ).join('')
      ).join('');
      return { d, value: f.value };
    });
  }, [projection, w, h]);

  // Parallel isolines for the resistor field. Same grid, same projection, so
  // the two contour systems align pixel-for-pixel.
  const resistorContours = useMemo(() => {
    const gridW = 280;
    const gridH = Math.round(gridW * (h / w));
    const values = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const cx = ((gx + 0.5) / gridW) * w;
        const cy = ((gy + 0.5) / gridH) * h;
        const coord = projection.invert([cx, cy]);
        if (!coord) continue;
        const [lng, lat] = coord;
        if (lat < 23 || lat > 51 || lng < -126 || lng > -65) continue;
        values[gy * gridW + gx] = resistorFieldAt(lat, lng);
      }
    }

    const thresholds = [];
    for (let t = 0.12; t <= 0.94; t += 0.10) thresholds.push(+t.toFixed(2));

    const contourGen = d3.contours()
      .size([gridW, gridH])
      .thresholds(thresholds);

    const features = contourGen(values);
    const sx = w / gridW;
    const sy = h / gridH;

    return features.map(f => {
      const d = f.coordinates.map(polygon =>
        polygon.map(ring =>
          'M' + ring.map(([x, y]) =>
            `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`
          ).join('L') + 'Z'
        ).join('')
      ).join('');
      return { d, value: f.value };
    });
  }, [projection, w, h]);

  const conusPath = useMemo(() => {
    return CONUS.map((p, i) => {
      const proj = projection(p);
      if (!proj) return '';
      return (i === 0 ? 'M' : 'L') + proj[0].toFixed(1) + ',' + proj[1].toFixed(1);
    }).join(' ') + ' Z';
  }, [projection]);

  const projectedSites = useMemo(() => {
    return SITES
      .map(s => {
        const p = projection([s.lng, s.lat]);
        if (!p) return null;
        return { ...s, x: p[0], y: p[1], field: fieldAt(s.lat, s.lng) };
      })
      .filter(Boolean);
  }, [projection]);

  const projectedPOI = useMemo(() => {
    return GEO_POI
      .map(p => {
        const proj = projection([p.lng, p.lat]);
        if (!proj) return null;
        return { ...p, x: proj[0], y: proj[1], field: fieldAt(p.lat, p.lng) };
      })
      .filter(Boolean);
  }, [projection]);

  const statePaths = useMemo(() => {
    if (!stateGeo || !stateGeo.features) return [];
    const pathGen = d3.geoPath(projection);
    return stateGeo.features.map((f, i) => ({
      key: f.id ?? f.properties?.name ?? i,
      d: pathGen(f) || '',
    })).filter(s => s.d);
  }, [stateGeo, projection]);

  const graticule = useMemo(() => {
    const lats = [];
    const lngs = [];
    for (let lat = 25; lat <= 49; lat += 4) {
      const path = [];
      for (let lng = -125; lng <= -65; lng += 1.5) {
        const p = projection([lng, lat]);
        if (p) path.push((path.length === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      lats.push(path.join(' '));
    }
    for (let lng = -120; lng <= -70; lng += 10) {
      const path = [];
      for (let lat = 25; lat <= 49; lat += 0.8) {
        const p = projection([lng, lat]);
        if (p) path.push((path.length === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      lngs.push(path.join(' '));
    }
    return { lats, lngs };
  }, [projection]);

  const activeSite = hovered;

  // Convert a clientX/Y from the map SVG into a geographic (lat, lng), or null
  // if the cursor is outside the projection's defined area.
  const eventToLatLng = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const svgX = ((clientX - rect.left) / rect.width) * w;
    const svgY = ((clientY - rect.top) / rect.height) * h;
    const inv = zoomT.invert([svgX, svgY]);
    const ll = projection.invert(inv);
    if (!ll) return null;
    const [lng, lat] = ll;
    if (lat < CONTOUR_LAT_MIN || lat > CONTOUR_LAT_MAX) return null;
    if (lng < CONTOUR_LNG_MIN || lng > CONTOUR_LNG_MAX) return null;
    return { lat, lng };
  };

  // Mouse move on the map updates the cursor (if not locked). Throttled via rAF.
  const handleMapMouseMove = (e) => {
    if (cursorLocked) return;
    const ll = eventToLatLng(e.clientX, e.clientY);
    if (!ll) return;
    cursorRef.current = ll;
    if (!cursorRafRef.current) {
      cursorRafRef.current = requestAnimationFrame(() => {
        if (cursorRef.current) setCursor(cursorRef.current);
        cursorRafRef.current = null;
      });
    }
  };

  // Touch on empty map drops a cursor; pin/POI taps stop propagation so they
  // open the drawer instead. Single-finger only — pinch zoom uses two fingers.
  const handleMapTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const ll = eventToLatLng(t.clientX, t.clientY);
    if (!ll) return;
    setCursor(ll);
    setCursorLocked(true);
  };

  // Map click on empty area: clear drawers AND drop cursor at the click point.
  const handleMapClick = (e) => {
    setSelected(null);
    setHovered(null);
    const ll = eventToLatLng(e.clientX, e.clientY);
    if (ll) {
      setCursor(ll);
      setCursorLocked(true);
    }
  };

  // Project a 200-km swath end-points around the cursor for crosshair rendering
  const cursorCrosshair = useMemo(() => {
    if (!cursor) return null;
    const center = projection([cursor.lng, cursor.lat]);
    if (!center) return null;
    const cosLat = Math.cos(cursor.lat * Math.PI / 180);
    const dLng = 200 / (111 * cosLat);
    const dLat = 200 / 111;
    const pW = projection([cursor.lng - dLng, cursor.lat]);
    const pE = projection([cursor.lng + dLng, cursor.lat]);
    const pS = projection([cursor.lng, cursor.lat - dLat]);
    const pN = projection([cursor.lng, cursor.lat + dLat]);
    return { center, pW, pE, pS, pN };
  }, [cursor, projection]);

  return (
    <div className="min-h-screen w-full bg-black text-stone-200 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family=JetBrains+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.18); }
        }
        @keyframes pin-in {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        .pin-enter { animation: pin-in 600ms cubic-bezier(.2,.8,.2,1) backwards; }
        .grain { position: relative; }
        .grain::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.8  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          opacity: 0.06;
          mix-blend-mode: overlay;
          pointer-events: none;
        }
      `}</style>

      <div ref={containerRef} className="relative max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-10">

        {/* Header */}
        <div className="relative mb-4 sm:mb-8">
          <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] sm:text-xs tracking-[0.3em] text-amber-300/70 mb-1.5 sm:mb-2">
            FIG. 01 · CONDUCTIVITY × DEVOTION
          </div>
          <h1
            style={{fontFamily:'Fraunces, serif', fontWeight:300}}
            className="text-[2.2rem] sm:text-6xl md:text-7xl leading-[0.95] tracking-tight text-stone-100"
          >
            Where the<br/>
            <span style={{fontStyle:'italic'}} className="text-amber-200">ground hums</span>
          </h1>
          <p style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="mt-2.5 sm:mt-4 max-w-xl text-[13px] sm:text-base text-stone-400 leading-relaxed">
            Sacred American sites laid over the magnetotelluric pulse of the contiguous United States. Packed isolines mark zones of strong crustal conductivity — fluids, melt, fault damage. Notice where the pins want to land.
          </p>
        </div>

        {/* Plain-English explainer — what the colors mean, how deep they go,
            why they matter. Sits between the hero and the visualization so a
            new reader knows what to look for. */}
        <div className="mb-6 sm:mb-10 max-w-2xl">
          <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] sm:text-[11px] tracking-[0.28em] text-amber-300/70 mb-2 sm:mb-3">
            READING THE GROUND
          </div>
          <p style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[13.5px] sm:text-[15.5px] text-stone-300 leading-relaxed">
            You&rsquo;re looking at the United States rendered as an electrical body. Hot, wet, fractured rock &mdash; magma chambers, fault damage, fluid-bearing scars &mdash; passes electrical current easily; those zones glow as <span className="text-amber-200">yellow contours</span> on the map, and the <span className="text-amber-200">yellow line</span> in each depth chart traces how far down the conductive rock reaches, sometimes 5&nbsp;km, sometimes 200. Old, cold igneous rock blocks current. Those zones appear as <span className="text-sky-300">cyan dashed contours</span> along the East Coast, where a Pangaea-era slab runs from Maine to Georgia; the <span className="text-sky-300">cyan band</span> in each depth chart fills its depth extent. At their most concentrated centers, these features don&rsquo;t stay shallow &mdash; they thread down through the crust into the deep mantle, tying the surface to the same interior that moves continents and feeds volcanoes. Yellow is where the Earth conducts. Cyan is where it doesn&rsquo;t.
          </p>
        </div>

        {/* Map + depth visuals — side-by-side on desktop, stacked on mobile */}
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6">
        <div className="lg:h-full lg:flex lg:flex-col">

        {/* Map */}
        <div
          className="rounded-md overflow-hidden ring-1 ring-stone-800/60 bg-black flex flex-col lg:h-full"
          style={{boxShadow: '0 30px 80px -20px rgba(255,170,80,0.10), inset 0 0 80px rgba(255,200,100,0.03)'}}
        >
          {/* TOP BAR — toggles, about, reset */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-2 bg-stone-950/80 border-b border-stone-800/60">
            <span
              style={{fontFamily:'JetBrains Mono, monospace'}}
              className="text-[9px] tracking-[0.22em] text-stone-500 mr-auto hidden md:inline-block"
            >
              UNITED STATES · MT FIELD
            </span>
            <div className="md:hidden flex-1" />
            {[
              { label: 'FIELD',  state: showField,     set: setShowField     },
              { label: 'RESIST', state: showResistors, set: setShowResistors },
              { label: 'STATES', state: showStates,    set: setShowStates    },
              { label: 'SITES',  state: showSites,     set: setShowSites     },
              { label: 'GEO',    state: showPOI,       set: setShowPOI       },
            ].map(c => (
              <button
                key={c.label}
                onClick={(e) => { e.stopPropagation(); c.set(v => !v); }}
                className="px-2 py-1.5 rounded ring-1 ring-stone-700/60 text-[10px] tracking-[0.18em] text-stone-300 hover:bg-stone-900 hover:text-stone-100 active:text-stone-100 transition-colors flex items-center gap-1.5"
                style={{fontFamily:'JetBrains Mono, monospace'}}
                aria-label={c.label}
              >
                {c.state ? <Eye size={12} /> : <EyeOff size={12} />}
                <span className="hidden lg:inline">{c.label}</span>
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
              className="px-2 py-1.5 rounded ring-1 ring-stone-700/60 text-[10px] tracking-[0.18em] text-stone-300 hover:bg-stone-900 hover:text-stone-100 active:text-stone-100 transition-colors flex items-center gap-1.5"
              style={{fontFamily:'JetBrains Mono, monospace'}}
              aria-label="About"
            >
              <Info size={12} />
              <span className="hidden lg:inline">ABOUT</span>
            </button>
            {zoomT.k > 1.01 && (
              <button
                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                className="px-2 py-1.5 rounded bg-amber-200/15 ring-1 ring-amber-200/40 text-[10px] tracking-[0.18em] text-amber-100 hover:bg-amber-200/25 active:bg-amber-200/30 transition-colors flex items-center gap-1.5"
                style={{fontFamily:'JetBrains Mono, monospace'}}
                aria-label="Reset zoom"
              >
                <Maximize2 size={12} />
                <span className="hidden lg:inline">RESET</span>
              </button>
            )}
          </div>

          {/* MAP AREA — flex container; centers the inner SVG vertically. */}
          <div className="grain bg-black flex-1 min-h-0 flex items-center justify-center">
          {/* SVG + tooltips share this aspect-sized wrapper so tooltips'
              percentage positions align with the actual map content. */}
          <div className="relative w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${w} ${h}`}
            className="block w-full"
            preserveAspectRatio="xMidYMid meet"
            style={{display:'block', touchAction: 'pan-y', cursor: zoomT.k > 1 ? 'grab' : 'default'}}
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onTouchStart={handleMapTouchStart}
          >
            <defs>
              <clipPath id="conus-clip">
                <path d={conusPath} />
              </clipPath>
              <radialGradient id="amber-halo">
                <stop offset="0%"   stopColor="#fef3c7" stopOpacity="0.95" />
                <stop offset="35%"  stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="amber-halo-soft">
                <stop offset="0%"   stopColor="#fde68a" stopOpacity="0.7" />
                <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* All zoomable map content lives inside this transform group */}
            <g transform={zoomT.toString()}>

            {/* Graticule */}
            <g stroke="#d4af7a" strokeWidth="0.4" fill="none" opacity="0.06">
              {graticule.lats.map((d, i) => <path key={'la'+i} d={d} />)}
              {graticule.lngs.map((d, i) => <path key={'ln'+i} d={d} />)}
            </g>

            {/* State boundaries */}
            {showStates && statePaths.length > 0 && (
              <g
                clipPath="url(#conus-clip)"
                fill="none"
                stroke="#fff8e7"
                strokeOpacity="0.18"
                strokeWidth="0.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              >
                {statePaths.map(s => <path key={s.key} d={s.d} />)}
              </g>
            )}

            {/* Resistor isolines (Piedmont Resistor) — drawn first so the
                cream conductor contours sit on top where they overlap.
                Dashed cyan reads as the quiet undercurrent of the map. */}
            {showField && showResistors && (
              <g clipPath="url(#conus-clip)" fill="none">
                {resistorContours.map((c, i) => {
                  const t = Math.max(0, Math.min(1, (c.value - 0.12) / 0.78));
                  const op = 0.22 + t * 0.40;
                  const sw = 0.6 + t * 0.6;
                  return (
                    <path
                      key={i}
                      d={c.d}
                      stroke="#7dd3fc"
                      strokeOpacity={op}
                      strokeWidth={sw}
                      strokeDasharray="3 3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            )}

            {/* Contour isolines */}
            {showField && (
              <g clipPath="url(#conus-clip)" fill="none">
                {contours.map((c, i) => {
                  const t = (c.value - 0.10) / 0.84;
                  const op = 0.55 + t * 0.40;
                  const sw = 0.9 + t * 0.9;
                  return (
                    <path
                      key={i}
                      d={c.d}
                      stroke="#fff8e7"
                      strokeOpacity={op}
                      strokeWidth={sw}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            )}

            {/* CONUS outline */}
            <path
              d={conusPath}
              fill="none"
              stroke="#fff8e7"
              strokeOpacity="0.55"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />

            {/* Geological POI layer (centroids of conductivity anomalies) */}
            {showPOI && projectedPOI.map((p, i) => {
              // Slight label offset to keep marker readable; alternate side by parity for variety
              const offX = (i % 2 === 0 ? 9 : -9);
              const anchor = i % 2 === 0 ? 'start' : 'end';
              const hasProfile = !!DEPTH_PROFILES[p.label];
              return (
                <g
                  key={'poi'+i}
                  style={{cursor: hasProfile ? 'pointer' : 'default'}}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasProfile) {
                      setSelectedPOI(p);
                      setSelected(null);
                      setHovered(null);
                    }
                  }}
                >
                  {/* Crosshair marker */}
                  <line
                    x1={p.x - 5} y1={p.y}
                    x2={p.x + 5} y2={p.y}
                    stroke="#7dd3fc"
                    strokeOpacity="0.85"
                    strokeWidth="1.1"
                    vectorEffect="non-scaling-stroke"
                    style={{pointerEvents: 'none'}}
                  />
                  <line
                    x1={p.x} y1={p.y - 5}
                    x2={p.x} y2={p.y + 5}
                    stroke="#7dd3fc"
                    strokeOpacity="0.85"
                    strokeWidth="1.1"
                    vectorEffect="non-scaling-stroke"
                    style={{pointerEvents: 'none'}}
                  />
                  <circle
                    cx={p.x} cy={p.y} r="2.3"
                    fill="none"
                    stroke="#bae6fd"
                    strokeOpacity="0.9"
                    strokeWidth="0.9"
                    vectorEffect="non-scaling-stroke"
                    style={{pointerEvents: 'none'}}
                  />
                  {/* Label backing for legibility on bright contours */}
                  <text
                    x={p.x + offX}
                    y={p.y + 3}
                    textAnchor={anchor}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10.625px',
                      letterSpacing: '0.06em',
                      fill: '#000',
                      stroke: '#000',
                      strokeWidth: '3',
                      strokeOpacity: '0.85',
                      paintOrder: 'stroke',
                      pointerEvents: 'none',
                    }}
                  >
                    {p.label.toUpperCase()}
                  </text>
                  <text
                    x={p.x + offX}
                    y={p.y + 3}
                    textAnchor={anchor}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10.625px',
                      letterSpacing: '0.06em',
                      fill: '#bae6fd',
                      pointerEvents: 'none',
                    }}
                  >
                    {p.label.toUpperCase()}
                  </text>
                  {/* Generous invisible hit area for tap/click */}
                  <circle cx={p.x} cy={p.y} r={20} fill="transparent" />
                </g>
              );
            })}

            {/* Pins */}
            {showSites && projectedSites.map((s, i) => {
              const haloR = 5 + s.field * 26;
              const baseOp = 0.30 + s.field * 0.65;
              const isActive = activeSite?.name === s.name;
              const animate = s.field > 0.45;
              return (
                <g
                  key={s.name}
                  className="pin-enter"
                  style={{cursor:'pointer', animationDelay: `${i * 30}ms`}}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(s);
                    setSelectedPOI(null);
                    setHovered(null);
                  }}
                >
                  {/* Soft outer halo (ambient) */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={haloR + (isActive ? 8 : 0)}
                    fill="url(#amber-halo-soft)"
                    style={{
                      opacity: 0.5,
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animation: animate ? `pulse-scale ${4.5 + (i % 5) * 0.4}s ease-in-out infinite` : 'none',
                      transition: 'r 240ms ease',
                    }}
                  />
                  {/* Inner halo */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={haloR * 0.6}
                    fill="url(#amber-halo)"
                    style={{ opacity: baseOp }}
                  />
                  {/* Outer ring (amber) */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={isActive ? 7 : 4.2}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={isActive ? 1.6 : 1.1}
                    style={{transition:'r 200ms ease, stroke-width 200ms ease'}}
                  />
                  {/* Bright core */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={isActive ? 2.6 : 1.6}
                    fill="#fef3c7"
                  />
                  {/* Larger invisible hit area for touch */}
                  <circle cx={s.x} cy={s.y} r={18} fill="transparent" />
                </g>
              );
            })}

            {/* Live cursor crosshair (E-W and N-S slice axes) */}
            {showLive && cursorCrosshair && (
              <g style={{pointerEvents:'none'}}>
                {cursorCrosshair.pW && cursorCrosshair.pE && (
                  <line
                    x1={cursorCrosshair.pW[0]} y1={cursorCrosshair.pW[1]}
                    x2={cursorCrosshair.pE[0]} y2={cursorCrosshair.pE[1]}
                    stroke="#fbbf24" strokeOpacity="0.55" strokeWidth="1.2"
                    strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
                  />
                )}
                {cursorCrosshair.pS && cursorCrosshair.pN && (
                  <line
                    x1={cursorCrosshair.pS[0]} y1={cursorCrosshair.pS[1]}
                    x2={cursorCrosshair.pN[0]} y2={cursorCrosshair.pN[1]}
                    stroke="#fbbf24" strokeOpacity="0.55" strokeWidth="1.2"
                    strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
                  />
                )}
                <circle cx={cursorCrosshair.center[0]} cy={cursorCrosshair.center[1]} r="6"
                  fill="none" stroke="#fbbf24" strokeOpacity="0.85" strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke" />
                <circle cx={cursorCrosshair.center[0]} cy={cursorCrosshair.center[1]} r="2"
                  fill="#fef9e7" />
              </g>
            )}

            </g>{/* end zoom transform group */}
          </svg>

          {/* Tooltip — desktop (floating near pin) */}
          {activeSite && (() => {
            const visX = zoomT.applyX(activeSite.x);
            const visY = zoomT.applyY(activeSite.y);
            const sx = (visX / w) * 100;
            const sy = (visY / h) * 100;
            const rightSide = sx > 62;
            const topSide = sy > 65;
            const fieldPct = Math.round(activeSite.field * 100);
            return (
              <div
                className="hidden sm:block absolute pointer-events-none"
                style={{
                  left: rightSide ? 'auto' : `calc(${sx}% + 14px)`,
                  right: rightSide ? `calc(${100 - sx}% + 14px)` : 'auto',
                  top: topSide ? 'auto' : `calc(${sy}% + 6px)`,
                  bottom: topSide ? `calc(${100 - sy}% + 6px)` : 'auto',
                  maxWidth: 240,
                }}
              >
                <div
                  className="backdrop-blur-md bg-black/85 ring-1 ring-amber-200/25 rounded overflow-hidden"
                  style={{
                    boxShadow: '0 10px 40px -10px rgba(255,200,100,0.30)',
                    fontFamily: 'IBM Plex Sans, sans-serif'
                  }}
                >
                  {SITE_IMAGES[activeSite.name] && (
                    <div className="relative w-full h-24 overflow-hidden bg-stone-900">
                      <img
                        src={SITE_IMAGES[activeSite.name]}
                        alt={activeSite.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        style={{filter:'saturate(0.85) contrast(1.05)'}}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                  <div style={{fontFamily:'Fraunces, serif', fontWeight:500}} className="text-stone-100 text-base leading-tight">
                    {activeSite.name}
                  </div>
                  <div className="text-stone-400 text-[11.5px] mt-1 leading-snug">{activeSite.note}</div>
                  <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.max(3, fieldPct)}%`,
                          background: `linear-gradient(90deg, rgba(251,191,36,0.45), #fcd34d)`
                        }}
                      />
                    </div>
                    <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-amber-200/85 tabular-nums">
                      {fieldPct.toString().padStart(2, '0')}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tooltip — mobile (bottom sheet, dismissible) */}
          {activeSite && (() => {
            const fieldPct = Math.round(activeSite.field * 100);
            return (
              <div className="sm:hidden absolute bottom-2 left-2 right-2 z-10">
                <div
                  className="backdrop-blur-md bg-black/85 ring-1 ring-amber-200/25 px-3.5 py-3 rounded"
                  style={{
                    boxShadow: '0 10px 40px -10px rgba(255,200,100,0.30)',
                    fontFamily: 'IBM Plex Sans, sans-serif'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {SITE_IMAGES[activeSite.name] && (
                      <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-stone-900 ring-1 ring-stone-800">
                        <img
                          src={SITE_IMAGES[activeSite.name]}
                          alt={activeSite.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          style={{filter:'saturate(0.85) contrast(1.05)'}}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div style={{fontFamily:'Fraunces, serif', fontWeight:500}} className="text-stone-100 text-base leading-tight">
                        {activeSite.name}
                      </div>
                      <div className="text-stone-400 text-[12px] mt-1 leading-snug">{activeSite.note}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-stone-800 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.max(3, fieldPct)}%`,
                              background: `linear-gradient(90deg, rgba(251,191,36,0.45), #fcd34d)`
                            }}
                          />
                        </div>
                        <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-amber-200/85 tabular-nums">
                          {fieldPct.toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelected(null); setHovered(null); }}
                      className="-m-1 p-1 text-stone-500 hover:text-stone-100 active:text-stone-100"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          </div>
          </div>

          {/* BOTTOM BAR — full-width legend */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-stone-950/80 border-t border-stone-800/60">
            <span
              style={{fontFamily:'JetBrains Mono, monospace'}}
              className="text-[9px] tracking-[0.22em] text-stone-500 hidden md:inline-block"
            >
              ISOLINES · DENSITY = INTENSITY
            </span>
            <span
              style={{fontFamily:'JetBrains Mono, monospace'}}
              className="text-[9px] tracking-[0.2em] text-stone-500 md:ml-auto"
            >
              CRATONIC
            </span>
            <svg className="flex-1 h-4 max-w-xs md:max-w-sm" viewBox="0 0 160 18" preserveAspectRatio="none">
              {[
                {x:8,   op:0.55},
                {x:34,  op:0.62},
                {x:62,  op:0.68}, {x:70,  op:0.72},
                {x:96,  op:0.78}, {x:102, op:0.82}, {x:108, op:0.86},
                {x:128, op:0.88}, {x:132, op:0.92}, {x:136, op:0.94},
                {x:140, op:0.96}, {x:144, op:0.98}, {x:148, op:1.0},
              ].map((l, i) => (
                <line key={i} x1={l.x} y1="2" x2={l.x} y2="16" stroke="#fff8e7" strokeOpacity={l.op} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            <span
              style={{fontFamily:'JetBrains Mono, monospace'}}
              className="text-[9px] tracking-[0.2em] text-amber-200/85"
            >
              UNREST
            </span>
          </div>
        </div>
        </div>

        {/* Live cursor preview: two cross-sections that update as you move
            the mouse over the map (or tap on mobile) */}
        <div className="mt-6 lg:mt-0">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="min-w-0 flex-1">
              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.22em] text-amber-300/70">
                LIVE BENEATH CURSOR
              </div>
              <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] text-stone-500 mt-0.5">
                {cursor ? (
                  <>
                    <span style={{fontFamily:'JetBrains Mono, monospace'}} className="text-stone-400 tabular-nums">
                      {cursor.lat.toFixed(2)}°N · {Math.abs(cursor.lng).toFixed(2)}°W
                    </span>
                    <span className="ml-2 text-stone-600">
                      {cursorLocked ? '· locked' : '· hover to scrub'}
                    </span>
                  </>
                ) : 'hover the map to scrub'}
                {!contourTable && (
                  <span className="ml-2 text-stone-600 italic">
                    · building table {Math.round(tableProgress * 100)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {cursorLocked && (
                <button
                  onClick={() => setCursorLocked(false)}
                  className="px-2 py-1.5 rounded bg-amber-200/15 ring-1 ring-amber-200/40 text-[10px] tracking-[0.18em] text-amber-100 hover:bg-amber-200/25 transition-colors"
                  style={{fontFamily:'JetBrains Mono, monospace'}}
                >
                  UNLOCK
                </button>
              )}
              <button
                onClick={() => setShowLive(v => !v)}
                className="px-2 py-1.5 rounded bg-stone-950/70 ring-1 ring-stone-700/60 text-[10px] tracking-[0.18em] text-stone-300 hover:bg-stone-900 transition-colors"
                style={{fontFamily:'JetBrains Mono, monospace'}}
              >
                {showLive ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          {showLive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <MiniCrossSection
                table={contourTable}
                resistorTable={resistorTable}
                lat={cursor?.lat}
                lng={cursor?.lng}
                axis="ew"
              />
              <MiniCrossSection
                table={contourTable}
                resistorTable={resistorTable}
                lat={cursor?.lat}
                lng={cursor?.lng}
                axis="ns"
              />
            </div>
          )}
        </div>
        </div>

        {/* Brightest vs Quietest sites */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: 'BRIGHTEST GROUND', sort: -1 },
            { label: 'QUIETEST GROUND', sort: 1 },
          ].map(({label, sort}) => {
            const list = [...projectedSites].sort((a,b) => sort * (a.field - b.field)).slice(0,5);
            return (
              <div key={label} className="bg-stone-950/60 ring-1 ring-stone-800/60 rounded-md p-4">
                <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.22em] text-amber-300/70 mb-3">
                  {label}
                </div>
                <ul className="space-y-1.5">
                  {list.map(s => (
                    <li
                      key={s.name}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => { setSelected(s); setSelectedPOI(null); }}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="flex-1 min-w-0">
                        <div style={{fontFamily:'Fraunces, serif'}} className="text-stone-100 text-[15px] leading-tight group-hover:text-amber-100 transition-colors truncate">
                          {s.name}
                        </div>
                      </div>
                      <div className="w-20 sm:w-28 h-1 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(3, Math.round(s.field * 100))}%`,
                            background: `linear-gradient(90deg, rgba(251,191,36,0.45), #fcd34d)`
                          }}
                        />
                      </div>
                      <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-stone-500 tabular-nums w-7 text-right">
                        {Math.round(s.field * 100).toString().padStart(2,'0')}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2" style={{fontFamily:'JetBrains Mono, monospace'}}>
          <div className="text-[10px] tracking-wider text-stone-600">
            FIELD AFTER USMTARRAY · KELBERT ET AL. 2026 · ILLUSTRATIVE
          </div>
          <div className="text-[10px] tracking-wider text-stone-600">
            {SITES.length} SITES · {ANOMALIES.length} ANOMALY CENTERS
          </div>
        </div>

        {/* Sacred-site cross-section drawer */}
        {selected && (
          <SiteCrossSectionDrawer
            site={selected}
            onClose={() => setSelected(null)}
          />
        )}

        {/* Depth-profile drawer */}
        {selectedPOI && (() => {
          const profile = DEPTH_PROFILES[selectedPOI.label];
          if (!profile) return null;
          const maxDepth = 220;
          const chartH = 360;
          const chartW = 110;
          const depthToY = (km) => (km / maxDepth) * chartH;
          const intensityToX = (i) => Math.max(2, i * (chartW - 6));
          const nearby = nearbySites(selectedPOI, SITES, 3.0).slice(0, 6);

          // Smooth curve: sample intensity at every km, linearly within layers
          const samplePoints = [];
          for (let km = 0; km <= maxDepth; km += 2) {
            const layer = profile.layers.find(l => km >= l.topKm && km <= l.botKm) || profile.layers[profile.layers.length-1];
            samplePoints.push([intensityToX(layer.intensity), depthToY(km)]);
          }
          const curveD = samplePoints
            .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1))
            .join(' ');

          return (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end backdrop-blur-md bg-black/70"
              onClick={() => setSelectedPOI(null)}
            >
              <div
                className="relative w-full sm:w-[460px] sm:max-w-[92vw] bg-black sm:bg-stone-950 ring-1 ring-stone-800 rounded-t-lg sm:rounded-t-none sm:rounded-l-md max-h-[88vh] sm:max-h-none sm:h-screen overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{boxShadow: '-30px 0 80px -20px rgba(125,211,252,0.10)'}}
              >
                {/* Close handle */}
                <button
                  onClick={() => setSelectedPOI(null)}
                  className="absolute top-3 right-3 p-1.5 rounded hover:bg-stone-900 text-stone-400 hover:text-stone-100 z-10"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>

                {/* Mobile grab handle */}
                <div className="sm:hidden flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 rounded-full bg-stone-700" />
                </div>

                <div className="px-5 sm:px-7 py-5 sm:py-8">
                  <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.3em] text-sky-300/70 mb-2">
                    DEPTH PROFILE
                  </div>
                  <h2 style={{fontFamily:'Fraunces, serif', fontWeight:300}} className="text-2xl sm:text-3xl leading-tight text-stone-100">
                    {selectedPOI.label}
                  </h2>
                  <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="mt-1 text-[12.5px] text-sky-200/80 italic">
                    {profile.signature}
                  </div>

                  {/* Profile chart */}
                  <div className="mt-5 flex gap-3">
                    {/* Depth axis */}
                    <div className="flex flex-col justify-between" style={{height: chartH, fontFamily:'JetBrains Mono, monospace'}}>
                      {[0, 50, 100, 150, 200].map(km => (
                        <div key={km} className="text-[9px] text-stone-500 tabular-nums leading-none">
                          {km}<span className="text-stone-700"> km</span>
                        </div>
                      ))}
                    </div>

                    {/* Bands + curve */}
                    <div className="relative" style={{width: chartW, height: chartH}}>
                      {/* Faint depth gridlines */}
                      <svg width={chartW} height={chartH} className="absolute inset-0">
                        {[50, 100, 150, 200].map(km => (
                          <line
                            key={km}
                            x1={0} y1={depthToY(km)}
                            x2={chartW} y2={depthToY(km)}
                            stroke="#fff8e7"
                            strokeOpacity="0.06"
                            strokeWidth="0.5"
                          />
                        ))}
                        {/* Layer bands as filled rects */}
                        {profile.layers.map((l, i) => {
                          const y = depthToY(l.topKm);
                          const h = depthToY(l.botKm) - y;
                          return (
                            <rect
                              key={i}
                              x={0}
                              y={y}
                              width={chartW}
                              height={h}
                              fill="#fff8e7"
                              fillOpacity={0.05 + l.intensity * 0.18}
                            />
                          );
                        })}
                        {/* Moho line */}
                        <line
                          x1={0} y1={depthToY(MOHO_KM)}
                          x2={chartW} y2={depthToY(MOHO_KM)}
                          stroke="#fbbf24"
                          strokeOpacity="0.55"
                          strokeWidth="0.7"
                          strokeDasharray="3 2"
                        />
                        <text
                          x={chartW - 4}
                          y={depthToY(MOHO_KM) - 3}
                          textAnchor="end"
                          style={{
                            fontFamily:'JetBrains Mono, monospace',
                            fontSize:'8px',
                            letterSpacing:'0.1em',
                            fill:'#fbbf24',
                            fillOpacity:0.75,
                          }}
                        >
                          MOHO
                        </text>
                        {/* Smooth conductivity curve */}
                        <path
                          d={curveD}
                          fill="none"
                          stroke="#7dd3fc"
                          strokeOpacity="0.95"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {/* Curve area fill toward the right edge */}
                        <path
                          d={curveD + ` L${chartW},${chartH} L0,${chartH} Z`}
                          fill="#7dd3fc"
                          fillOpacity="0.06"
                        />
                      </svg>
                    </div>

                    {/* Layer labels */}
                    <div className="flex-1 relative" style={{height: chartH, fontFamily:'IBM Plex Sans, sans-serif'}}>
                      {profile.layers.map((l, i) => {
                        const y = depthToY(l.topKm);
                        const h = depthToY(l.botKm) - y;
                        return (
                          <div
                            key={i}
                            className="absolute left-0 right-0 flex items-center pl-2"
                            style={{top: y, height: h}}
                          >
                            <div className="border-l border-stone-700 pl-2 -ml-2">
                              <div className="text-[11px] text-stone-200 leading-tight">
                                {l.label}
                              </div>
                              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[9px] text-stone-500 mt-0.5 tabular-nums">
                                {l.topKm}–{l.botKm} km · σ {Math.round(l.intensity * 100)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend strip */}
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-stone-500" style={{fontFamily:'JetBrains Mono, monospace'}}>
                    <span className="inline-block w-3 h-[2px] bg-sky-300 rounded" />
                    <span>CONDUCTIVITY →</span>
                    <span className="ml-auto inline-block w-3 h-[1px] bg-amber-400 opacity-70" />
                    <span className="text-amber-300/70">CRUST / MANTLE</span>
                  </div>

                  {/* Note */}
                  <div
                    style={{fontFamily:'IBM Plex Sans, sans-serif'}}
                    className="mt-5 text-[13px] text-stone-300 leading-relaxed border-l-2 border-sky-400/30 pl-3"
                  >
                    {profile.note}
                  </div>

                  {/* Nearby sacred sites */}
                  {nearby.length > 0 && (
                    <div className="mt-6">
                      <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.22em] text-amber-300/70 mb-2.5">
                        NEARBY SACRED SITES
                      </div>
                      <ul className="space-y-1">
                        {nearby.map(s => {
                          const km = Math.round(s.dist * 111);
                          return (
                            <li key={s.name} className="flex items-baseline gap-2 py-1 border-b border-stone-900 last:border-b-0">
                              <ChevronRight size={11} className="text-amber-300/60 flex-shrink-0 self-center" />
                              <div className="flex-1 min-w-0">
                                <div style={{fontFamily:'Fraunces, serif'}} className="text-[14px] text-stone-100 leading-tight">
                                  {s.name}
                                </div>
                                <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[11px] text-stone-500 mt-0.5">
                                  {s.note}
                                </div>
                              </div>
                              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] text-stone-600 tabular-nums whitespace-nowrap">
                                ~{km} km
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Footer caveat */}
                  <div
                    style={{fontFamily:'JetBrains Mono, monospace'}}
                    className="mt-6 pt-4 border-t border-stone-800/80 text-[9.5px] tracking-wider text-stone-600 leading-relaxed"
                  >
                    PROFILE STYLIZED · AFTER PUBLISHED MT INVERSIONS · BEDROSIAN, KIM, MURPHY, KELBERT ET AL.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sources — full-width CTA section, pinned to the bottom of the page */}
        <section className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-stone-800/60">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] sm:text-[11px] tracking-[0.28em] text-amber-300/70">
              SOURCES
            </div>
            <div className="flex-1 h-px bg-stone-800/60" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <a
              href="https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024RG000850"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-stone-950/70 ring-1 ring-amber-200/25 hover:ring-amber-200/70 hover:bg-stone-900/80 rounded-md px-5 py-5 sm:px-7 sm:py-7 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] sm:text-[11px] tracking-[0.24em] text-amber-300/80 mb-2">
                    READ THE PAPER
                  </div>
                  <div style={{fontFamily:'Fraunces, serif'}} className="text-stone-100 text-[17px] sm:text-[20px] leading-tight">
                    The United States Magnetotelluric Array
                    <span className="text-stone-400"> &amp; the National Impedance Map</span>
                  </div>
                  <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] sm:text-[13px] text-stone-500 mt-2">
                    Kelbert et al., <span className="italic">Reviews of Geophysics</span>, 2026
                  </div>
                </div>
                <div
                  style={{fontFamily:'JetBrains Mono, monospace'}}
                  className="text-amber-200/70 text-2xl leading-none group-hover:translate-x-1 transition-transform flex-shrink-0"
                  aria-hidden
                >
                  ↗
                </div>
              </div>
            </a>

            <a
              href="https://ds.iris.edu/ds/products/emtf/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-stone-950/70 ring-1 ring-amber-200/25 hover:ring-amber-200/70 hover:bg-stone-900/80 rounded-md px-5 py-5 sm:px-7 sm:py-7 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] sm:text-[11px] tracking-[0.24em] text-amber-300/80 mb-2">
                    BROWSE THE RAW DATA
                  </div>
                  <div style={{fontFamily:'Fraunces, serif'}} className="text-stone-100 text-[17px] sm:text-[20px] leading-tight">
                    EarthScope MT Transfer Functions
                    <span className="text-stone-400"> · IRIS SPUD</span>
                  </div>
                  <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="text-[12px] sm:text-[13px] text-stone-500 mt-2">
                    1,700+ stations · XML &amp; EDI downloads
                  </div>
                </div>
                <div
                  style={{fontFamily:'JetBrains Mono, monospace'}}
                  className="text-amber-200/70 text-2xl leading-none group-hover:translate-x-1 transition-transform flex-shrink-0"
                  aria-hidden
                >
                  ↗
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* About modal */}
        {showInfo && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-md bg-black/75"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="relative max-w-lg w-full bg-stone-950 ring-1 ring-stone-800 rounded-md p-6 sm:p-8"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-3 right-3 p-1.5 rounded hover:bg-stone-900 text-stone-400 hover:text-stone-100"
              >
                <X size={16} />
              </button>
              <div style={{fontFamily:'JetBrains Mono, monospace'}} className="text-[10px] tracking-[0.3em] text-amber-300/70 mb-2">
                METHODS · CAVEATS
              </div>
              <h2 style={{fontFamily:'Fraunces, serif', fontWeight:300}} className="text-2xl sm:text-3xl mb-4 leading-tight">
                What you're <span style={{fontStyle:'italic'}}>looking at</span>
              </h2>
              <div style={{fontFamily:'IBM Plex Sans, sans-serif'}} className="space-y-3 text-sm text-stone-300 leading-relaxed">
                <p>
                  The contour field is a stylized synthesis of crustal-conductivity features documented in the USMTArray national impedance map (Kelbert et al., 2026, <span style={{fontFamily:'JetBrains Mono'}} className="text-[12px] text-amber-200/85">Reviews of Geophysics</span>) — Yellowstone, the Cascade arc, Long Valley, the Salton Trough, the Rio Grande Rift, the Mid-Continent Rift, the Appalachian conductivity anomaly, the Connecticut Valley Mesozoic rift, and others. It approximates published anomaly geometry rather than displaying raw station impedances.
                </p>
                <p>
                  The dashed cyan band along the East Coast is the <span className="text-sky-200/90">Piedmont Resistor</span> — a Pangaea-era fragment of igneous basement, the same array's other signature find. Cream contours mark where rock <em>passes</em> current; cyan contours mark where it <em>blocks</em> current. In the cross-section drawer, the yellow line traces the bottom of conductive zones and the cyan band fills the depth extent of the resistor.
                </p>
                <p>
                  Each pin's halo grows with the underlying field. Sites on quiet cratonic crust glow softly; sites on geologically active zones flare bright. Where contour lines pack tightly, conductivity rises steeply.
                </p>
                <p className="text-stone-400 italic border-l-2 border-amber-300/40 pl-3">
                  The pattern is real, but the causation is mundane: dramatic geology produces both vivid conductivity contrasts and the kind of striking landscape humans have always called sacred. The Earth doesn't hum at vortices. It hums where rock meets fluid, fault, and melt — and those places have always made us look up.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
