import { Button } from '../ui/Button'
import { useReadOnly } from './ReadOnlyGuard'

export function ReadOnlyButton(props: React.ComponentProps<typeof Button>) {
  const readOnly = useReadOnly()
  return (
    <Button
      {...props}
      disabled={props.disabled || readOnly}
      title={readOnly ? 'Read-only access' : props.title}
    />
  )
}


