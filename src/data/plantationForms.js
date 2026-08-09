import {
  addLand, editLand, removeLand,
  addZone, editZone, removeZone,
  addVertical, editVertical, removeVertical,
  addPole, editPole, removePole,
  addPlant, editPlant, removePlant,
} from '@/data/plantationLandRepo'
import { VARIETY_LIST, CROP_LIST } from '@/data/lookupsRepo'
import landImg from '@/assets/land.webp'
import zoneImg from '@/assets/zone.jpg'
import rowsImg from '@/assets/rows.webp'
import poleImg from '@/assets/pole.webp'
import plantImg from '@/assets/plant.jpg'

/**
 * plantationForms.js — one config per entity type in the hierarchy, so the
 * Explorer (and any screen) can drive add / edit / delete + the popup form for
 * every level from a single place.
 *
 *   land > zone > vertical(row) > pole > plant
 */
const LAND_UNITS = ['acre', 'cent', 'sqft', 'hectare'].map((u) => ({ value: u, label: u }))
const ZONE_UNITS = ['cent', 'acre', 'sqft', 'hectare'].map((u) => ({ value: u, label: u }))
const POLE_TYPES = [
  { value: '', label: '— select —' },
  { value: 'payyani', label: 'Payyani (live tree)' },
  { value: 'konna', label: 'Konna' },
  { value: 'pvc', label: 'PVC' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'support_leg', label: 'Supporting leg' },
  { value: 'plant', label: 'Plant itself' },
  { value: 'other', label: 'Other' },
]
const PLANT_STATUS = [
  { value: 'na', label: 'N/A (not planted)' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'defect', label: 'Defect' },
  { value: 'dead', label: 'Dead' },
]
export const PLANT_STATUS_LABEL = Object.fromEntries(PLANT_STATUS.map((s) => [s.value, s.label]))
const PLANT_STAGE = [
  { value: 'planned', label: 'Planned' },
  { value: 'planted', label: 'Planted' },
]
export const PLANT_STAGE_BADGE = { planned: 'bg-secondary-subtle text-secondary', planted: 'bg-success-subtle text-success' }
export const PLANT_STAGE_LABEL = Object.fromEntries(PLANT_STAGE.map((s) => [s.value, s.label]))

export const POLE_TYPE_LABEL = Object.fromEntries(POLE_TYPES.filter((t) => t.value).map((t) => [t.value, t.label]))
export const PLANT_STATUS_BADGE = { na: 'bg-light text-muted', healthy: 'bg-success-subtle text-success', defect: 'bg-warning-subtle text-dark', dead: 'bg-danger-subtle text-danger' }

export const ENTITY = {
  land: {
    singular: 'Property', icon: 'ri-plant-line', img: landImg, tone: 'success',
    childType: 'zone', parentField: null, idPrefix: 'land',
    add: addLand, edit: editLand, remove: removeLand,
    name: (n) => n.name,
    blank: () => ({ name: '', code: '', location: '', area: '', areaUnit: 'acre', ownership: 'owned', leaseFrom: '', leaseTo: '', note: '', image: '' }),
    fields: [
      { key: 'name', label: 'Property name', type: 'text', placeholder: 'Home estate', required: true, colClass: 'col-md-8' },
      { key: 'code', label: 'Code', type: 'text', placeholder: 'CHRY', colClass: 'col-md-4' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Village / district' },
      { key: 'area', label: 'Area', type: 'number', colClass: 'col-6' },
      { key: 'areaUnit', label: 'Unit', type: 'select', options: LAND_UNITS, colClass: 'col-6' },
      { key: 'ownership', label: 'Ownership', type: 'select', options: [{ value: 'owned', label: 'Owned' }, { value: 'leased', label: 'Leased' }] },
      { key: 'leaseFrom', label: 'Lease from', type: 'date', colClass: 'col-6', showIf: (f) => f.ownership === 'leased' },
      { key: 'leaseTo', label: 'Lease to', type: 'date', colClass: 'col-6', showIf: (f) => f.ownership === 'leased' },
      { key: 'note', label: 'Note', type: 'textarea' },
      { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/lands' },
    ],
  },
  zone: {
    singular: 'Zone', icon: 'ri-grid-line', img: zoneImg, tone: 'primary',
    childType: 'vertical', parentField: 'landId', idPrefix: 'zone',
    add: addZone, edit: editZone, remove: removeZone,
    name: (n) => n.name,
    bulk: { nameKey: 'name', namePrefix: 'Zone ', codePrefix: 'Z', shared: ['areaUnit', 'hasVerticals'] },
    blank: () => ({ name: '', code: '', area: '', areaUnit: 'cent', hasVerticals: false, note: '', layoutX: '', layoutY: '', layoutW: '', layoutH: '' }),
    fields: [
      { key: 'name', label: 'Zone name', type: 'text', placeholder: 'Zone 1 / North plot', required: true, colClass: 'col-md-8' },
      { key: 'code', label: 'Code', type: 'text', placeholder: 'ZA', colClass: 'col-md-4' },
      { key: 'area', label: 'Area', type: 'number', colClass: 'col-6' },
      { key: 'areaUnit', label: 'Unit', type: 'select', options: ZONE_UNITS, colClass: 'col-6' },
      { key: 'hasVerticals', label: 'Plants', type: 'switch', switchLabel: 'Has plants (rows)' },
      { key: 'layoutX', label: 'Plot X', type: 'number', placeholder: '0', colClass: 'col-3' },
      { key: 'layoutY', label: 'Plot Y', type: 'number', placeholder: '0', colClass: 'col-3' },
      { key: 'layoutW', label: 'Width', type: 'number', placeholder: '45', colClass: 'col-3' },
      { key: 'layoutH', label: 'Height', type: 'number', placeholder: '20', colClass: 'col-3' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
  },
  vertical: {
    singular: 'Row', icon: 'ri-menu-line', img: rowsImg, tone: 'info',
    childType: 'pole', parentField: 'zoneId', idPrefix: 'vt',
    add: addVertical, edit: editVertical, remove: removeVertical,
    name: (n) => n.name,
    bulk: { nameKey: 'name', namePrefix: 'Row ', codePrefix: 'R', shared: [] },
    blank: () => ({ name: '', code: '', note: '' }),
    fields: [
      { key: 'name', label: 'Row / vertical', type: 'text', placeholder: 'Row 1', required: true, colClass: 'col-md-8' },
      { key: 'code', label: 'Code', type: 'text', placeholder: 'R1', colClass: 'col-md-4' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
  },
  pole: {
    singular: 'Pole', icon: 'ri-signal-tower-line', img: poleImg, tone: 'secondary',
    childType: 'plant', parentField: 'verticalId', idPrefix: 'pole',
    add: addPole, edit: editPole, remove: removePole,
    name: (n) => n.label || 'Pole',
    bulk: { nameKey: 'label', namePrefix: 'Pole ', codePrefix: 'P', shared: ['poleType'] },
    blank: () => ({ label: '', code: '', poleType: '', note: '', image: '' }),
    fields: [
      { key: 'label', label: 'Pole label / no.', type: 'text', placeholder: 'P1', required: true, colClass: 'col-md-8' },
      { key: 'code', label: 'Code', type: 'text', placeholder: 'P1', colClass: 'col-md-4' },
      { key: 'poleType', label: 'Pole type', type: 'select', options: POLE_TYPES },
      { key: 'note', label: 'Note', type: 'textarea' },
      { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/poles' },
    ],
  },
  plant: {
    singular: 'Plant', icon: 'ri-seedling-line', img: plantImg, tone: 'success',
    childType: null, parentField: 'poleId', idPrefix: 'plant',
    add: addPlant, edit: editPlant, remove: removePlant,
    name: (n) => n.tag || n.variety || 'Plant',
    bulk: { nameKey: 'tag', namePrefix: 'Plant ', codePrefix: 'BP', shared: ['stage', 'variety', 'status', 'plantedDate'], lookups: { variety: VARIETY_LIST, crop: CROP_LIST } },
    blank: () => ({ tag: '', code: '', crop: '', plantType: '', variety: '', stage: 'planned', plantedDate: '', status: 'na', isMother: false, note: '', image: '' }),
    fields: [
      { key: 'tag', label: 'Plant tag', type: 'text', placeholder: 'TAG-001', required: true, colClass: 'col-md-8' },
      { key: 'code', label: 'Code', type: 'text', placeholder: 'BP1', colClass: 'col-md-4' },
      { key: 'crop', label: 'Crop', type: 'text', placeholder: 'Pepper / Payyani…', colClass: 'col-md-4' },
      { key: 'plantType', label: 'Type', type: 'select', options: [{ value: '', label: '—' }, { value: 'Grafted', label: 'Grafted' }, { value: 'Normal', label: 'Normal' }], colClass: 'col-md-4' },
      { key: 'variety', label: 'Variety', type: 'text', placeholder: 'e.g. Panniyur-1 pepper', colClass: 'col-md-4' },
      { key: 'stage', label: 'Stage', type: 'select', options: PLANT_STAGE, colClass: 'col-md-4' },
      { key: 'plantedDate', label: 'Planted on', type: 'date', colClass: 'col-md-4' },
      { key: 'status', label: 'Status', type: 'select', options: PLANT_STATUS, colClass: 'col-md-4' },
      { key: 'isMother', label: 'Mother plant', type: 'switch', switchLabel: 'Use as mother plant', colClass: 'col-md-8' },
      { key: 'note', label: 'Note', type: 'textarea' },
      { key: 'image', label: 'Photo', type: 'image', folder: 'plantation/plants' },
    ],
  },
}
