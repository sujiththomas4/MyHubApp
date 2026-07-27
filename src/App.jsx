import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Login from '@/pages/Login'
import UsersRoles from '@/pages/UsersRoles'
import MainLayout from '@/layouts/MainLayout'
import Dashboard from '@/pages/Dashboard'
import BeforeITrade from '@/pages/BeforeITrade'
import Journal from '@/pages/Journal'
import ChartPatterns from '@/pages/ChartPatterns'
import Loans from '@/pages/Loans'
import LoanDetail from '@/pages/LoanDetail'
import { BrokerOverview, BrokerAccount } from '@/pages/BrokerModule'
import { optionBuyingModule, intradayStocksModule, optionSellingModule } from '@/data/AppData'
import PnL from '@/pages/PnL'
import Capital from '@/pages/Capital'
import DailyOptionSelling from '@/pages/DailyOptionSelling'
import DailyRoutines from '@/pages/DailyRoutines'
import GymWorkouts from '@/pages/GymWorkouts'
import MonthlyEmis from '@/pages/MonthlyEmis'
import MoneyLent from '@/pages/MoneyLent'
import PlantationTracker from '@/pages/PlantationTracker'
import PlantationActivities from '@/pages/PlantationActivities'
import PlantationDashboard from '@/pages/PlantationDashboard'
import PlantationExplorer from '@/pages/PlantationExplorer'
import PlantationZones from '@/pages/PlantationZones'
import PlantationRows from '@/pages/PlantationRows'
import PlantationPoles from '@/pages/PlantationPoles'
import PlantationPlants from '@/pages/PlantationPlants'
import PlantationDefects from '@/pages/PlantationDefects'
import PlantationGallery from '@/pages/PlantationGallery'
import PlantationCapital from '@/pages/PlantationCapital'
import PlantationExpenses from '@/pages/PlantationExpenses'
import PlantationPepperBooked from '@/pages/PlantationPepperBooked'
import PlantationPropagation from '@/pages/PlantationPropagation'
import PlantationPlannedCrops from '@/pages/PlantationPlannedCrops'
import PlantationPlannedCropDetail from '@/pages/PlantationPlannedCropDetail'
import PlantationFertilizers from '@/pages/PlantationFertilizers'
import PlantationFertilizerDetail from '@/pages/PlantationFertilizerDetail'
import MasterData from '@/pages/MasterData'
import Savings from '@/pages/Savings'
import SavingsCategory from '@/pages/SavingsCategory'
import Settings from '@/pages/Settings'
import StockPnL from '@/pages/StockPnL'
import StockAccount from '@/pages/StockAccount'
import Placeholder from '@/pages/Placeholder'

/**
 * Only the Ecommerce dashboard ("/") is fully built for now.
 * A catch-all route renders <Placeholder /> so every sidebar link resolves to
 * a titled stub you can replace with a real screen later.
 */
export default function App() {
  const { ready, needsAuth, roleReady, isAdmin } = useAuth()

  if (!ready || !roleReady) return null // brief: restoring session / loading role
  if (needsAuth) return <Login />

  const memberHome = '/business/plantations/dashboard'

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Plantation — available to every signed-in user */}
        <Route path="/business/plantations" element={<PlantationTracker />} />
        <Route path="/business/plantations/pepper-booked" element={<PlantationPepperBooked />} />
        <Route path="/business/plantations/propagation" element={<PlantationPropagation />} />
        <Route path="/business/plantations/planned-crops" element={<PlantationPlannedCrops />} />
        <Route path="/business/plantations/planned-crops/:cropId" element={<PlantationPlannedCropDetail />} />
        <Route path="/business/plantations/health-center" element={<PlantationFertilizers />} />
        <Route path="/business/plantations/health-center/:fertId" element={<PlantationFertilizerDetail />} />
        <Route path="/business/plantations/activities" element={<PlantationActivities />} />
        <Route path="/business/plantations/dashboard" element={<PlantationDashboard />} />
        <Route path="/business/plantations/explorer" element={<PlantationExplorer />} />
        <Route path="/business/plantations/gallery" element={<PlantationGallery />} />
        <Route path="/business/plantations/defects" element={<PlantationDefects />} />
        <Route path="/business/plantations/capital" element={<PlantationCapital />} />
        <Route path="/business/plantations/expenses" element={<PlantationExpenses />} />
        <Route path="/business/plantations/lands/:landId/zones" element={<PlantationZones />} />
        <Route path="/business/plantations/zones/:zoneId/rows" element={<PlantationRows />} />
        <Route path="/business/plantations/rows/:verticalId/poles" element={<PlantationPoles />} />
        <Route path="/business/plantations/poles/:poleId/plants" element={<PlantationPlants />} />

        {/* Home: dashboard for admins, plantation for members */}
        <Route path="/" element={isAdmin ? <Dashboard /> : <Navigate to={memberHome} replace />} />

        {isAdmin && <>
          <Route path="/admin/users" element={<UsersRoles />} />
          <Route path="/admin/master-data" element={<MasterData />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/loans/:slug" element={<LoanDetail />} />
          <Route path="/wealth/savings" element={<Savings />} />
          <Route path="/wealth/savings/:category" element={<SavingsCategory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/investments/pnl" element={<StockPnL />} />
          <Route path="/investments/india" element={<StockPnL region="India" />} />
          <Route path="/investments/uae" element={<StockPnL region="UAE" />} />
          <Route path="/investments/:slug" element={<StockAccount />} />
          <Route path="/trading/before-i-trade" element={<BeforeITrade />} />
          {/* Old path kept so existing links/bookmarks still land somewhere. */}
          <Route path="/trading/rule-book" element={<BeforeITrade />} />
          <Route path="/trading/journal" element={<Journal />} />
          <Route path="/trading/chart-patterns" element={<ChartPatterns />} />
          <Route path="/trading/brokers" element={<BrokerOverview module={optionBuyingModule} />} />
          <Route path="/trading/brokers/:slug" element={<BrokerAccount module={optionBuyingModule} />} />
          <Route path="/business/intraday-stocks" element={<BrokerOverview module={intradayStocksModule} />} />
          <Route path="/business/intraday-stocks/:slug" element={<BrokerAccount module={intradayStocksModule} />} />
          <Route path="/business/option-selling" element={<BrokerOverview module={optionSellingModule} />} />
          <Route path="/business/option-selling/:slug" element={<BrokerAccount module={optionSellingModule} />} />
          <Route path="/trading/pnl" element={<PnL />} />
          <Route path="/business/capital" element={<Capital />} />
          <Route path="/business/daily-option-selling" element={<DailyOptionSelling />} />
          <Route path="/personal/daily-routines" element={<DailyRoutines />} />
          <Route path="/personal/gym-workouts" element={<GymWorkouts />} />
          <Route path="/money/emis" element={<MonthlyEmis />} />
          <Route path="/money/lent" element={<MoneyLent />} />
        </>}

        {/* Anything else: admins get the stub, members are sent to Plantation */}
        <Route path="*" element={isAdmin ? <Placeholder /> : <Navigate to={memberHome} replace />} />
      </Route>
    </Routes>
  )
}
