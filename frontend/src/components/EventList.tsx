import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Stack, Tooltip } from '@mui/material'
import { EvaluateResponse } from '../types/api'
import { tooltips } from '../tooltipTexts'

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
          <Tooltip title={tooltips.event.title} arrow>
            <Typography variant="h6" component="div">重要イベント</Typography>
          </Tooltip>
          <Tooltip title={tooltips.event.adjustment} arrow>
            <Chip label={`補正: ${eventDetails?.E_adj ?? 0}`} color="warning" variant="outlined" />
          </Tooltip>
        </Stack>
        <List>
          {items.map((event) => (
            <ListItem key={`${event.name}-${event.date}`} divider>
              <ListItemText
                primary={
                  <Tooltip title={tooltips.event.name} arrow>
                    <span>{event.name}</span>
                  </Tooltip>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Tooltip title={tooltips.event.datetime} arrow>
                      <span>日付: {event.date}</span>
                    </Tooltip>
                    <Tooltip title={tooltips.event.importance} arrow>
                      <span>重要度: {event.importance}</span>
                    </Tooltip>
                  </Stack>
                }
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
