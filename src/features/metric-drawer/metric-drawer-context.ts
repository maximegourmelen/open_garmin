import { createContext, useContext } from 'react';
import type { MetricId } from '../../content/glossary';

export const MetricDrawerContext = createContext<((id: MetricId) => void) | null>(null);
export const useMetricDrawer = () => useContext(MetricDrawerContext);
