import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Share2, TrendingUp, Code2, Palette, BarChart3,
} from 'lucide-react'

export const WORKSPACES = [
  {
    id:          'social',
    label:       'Social',
    description: 'Social Media Management',
    color:       '#F0A629',
    homeRoute:   '/',
    Icon:        Share2,
  },
  {
    id:          'digital',
    label:       'Digital',
    description: 'SEO & Digital Marketing',
    color:       '#3B82F6',
    homeRoute:   '/digital',
    Icon:        TrendingUp,
  },
  {
    id:          'web',
    label:       'Web',
    description: 'Web Development',
    color:       '#10B981',
    homeRoute:   '/web',
    Icon:        Code2,
  },
  {
    id:          'creative',
    label:       'Creative',
    description: 'Creative Studio',
    color:       '#8B5CF6',
    homeRoute:   '/creative',
    Icon:        Palette,
  },
  {
    id:          'reporting',
    label:       'Reporting',
    description: 'Agency Reporting',
    color:       '#F97316',
    homeRoute:   '/reporting',
    Icon:        BarChart3,
  },
]

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [workspaceId, setWorkspaceId] = useState(
    () => localStorage.getItem('wom_workspace') ?? 'social'
  )

  const switchWorkspace = (id) => {
    setWorkspaceId(id)
    localStorage.setItem('wom_workspace', id)
  }

  const workspace = WORKSPACES.find(w => w.id === workspaceId) ?? WORKSPACES[0]

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaceId, switchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
