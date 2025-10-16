import React from 'react';
import TimelineSchedule from './TimelineSchedule';

interface ModernScheduleProps {
  employeeId: string;
}

export default function ModernSchedule({ employeeId }: ModernScheduleProps) {
  return <TimelineSchedule employeeId={employeeId} />;
}
