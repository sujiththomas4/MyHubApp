import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Login from '@/pages/Login'
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
  const { ready, needsAuth } = useAuth()

  if (!ready) return null // brief: restoring session
  if (needsAuth) return <Login />

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
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
        <Route path="/business/plantations" element={<PlantationTracker />} />
        <Route path="/business/plantations/income" element={<PlantationTracker />} />
        <Route path="/business/plantations/expense" element={<PlantationTracker />} />
        <Route path="/business/plantations/activities" element={<PlantationActivities />} />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  )
}
