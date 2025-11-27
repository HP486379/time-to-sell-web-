import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Stack } from '@mui/material'
import { EvaluateResponse } from '../types/api'

interface Props {
  eventDetails?: EvaluateResponse['event_details']
}

function EventList({ eventDetails }: Props) {
  const effective = eventDetails?.effective_event
  const items = effective
    ? [effective]
    : [
        { name: 'FOMC', importance: 5, date: '2025-03-03' },
        { name: '雇用統計', importance: 3, date: '2025-03-07' },
      ]

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">重要イベント</Typography>
          <Chip label={`補正: ${eventDetails?.E_adj ?? 0}`} color="warning" variant="outlined" />
        </Stack>
        <List>
          {items.map((event) => (
            <ListItem key={`${event.name}-${event.date}`} divider>
              <ListItemText
                primary={event.name}
                secondary={`日付: ${event.date} | 重要度: ${event.importance}`}
                primaryTypographyProps={{ color: 'text.primary' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

export default EventList
