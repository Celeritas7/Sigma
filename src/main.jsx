import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { applyTheme, watchSystemTheme } from './lib/theme'

applyTheme()
watchSystemTheme()

createRoot(document.getElementById('root')).render(<App />)
