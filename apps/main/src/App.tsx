import { useState } from 'react'
import { ThemeToggle, useTheme } from '@taskflow/theme'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'
import { formatDate } from '@taskflow/utils'
import './App.css'

function App() {
  const { theme } = useTheme()
  const [name, setName] = useState('')

  return (
    <main className="scaffold">
      <Card className="demo-card">
        <CardHeader>
          <CardTitle>TaskFlow Main — Phase 2</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="meta">
            Theme: <Badge>{theme}</Badge> · {formatDate(new Date())}
          </p>
          <Alert
            variant="info"
            title="Shared packages wired"
            description="@taskflow/theme, @taskflow/ui, and @taskflow/utils are imported."
          />
          <div className="row">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button variant="primary" onClick={() => undefined}>
              {name ? `Hello, ${name}` : 'Say hello'}
            </Button>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
