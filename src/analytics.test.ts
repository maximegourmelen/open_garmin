import { describe, expect, it } from 'vitest';
import { makeDemo } from './demo';
import { addDays, formatPace, insightsFor, normalizeForTest, weekStart, weekStats, zoneTotals } from './test-utils';
import { recentDaily, todayKey } from './analytics';

describe('training calculations',()=>{
  it('handles leap days and week starts without UTC date shifts',()=>{
    expect(addDays('2024-02-28',1)).toBe('2024-02-29');
    expect(weekStart('2026-11-01','monday')).toBe('2026-10-26');
    expect(weekStart('2026-11-01','sunday')).toBe('2026-11-01');
  });
  it('compares the same weekdays instead of full prior weeks',()=>{
    const data=makeDemo();data.activities=[normalizeForTest('a','2026-10-26',5000),normalizeForTest('b','2026-10-19',4000),normalizeForTest('c','2026-10-24',20000)];
    const stats=weekStats(data,'2026-10-26');
    expect(stats.distance).toBe(5000);expect(stats.previousDistance).toBe(4000);expect(stats.delta).toBe(25);
  });
  it('does not double count children of a multisport activity',()=>{
    const data=makeDemo();data.activities=[normalizeForTest('parent','2026-10-26',5000),{...normalizeForTest('child','2026-10-26',5000),parent_id:'parent'}];
    expect(weekStats(data,'2026-10-26').distance).toBe(5000);
  });
  it('compares only prior sessions completed by the same local time',()=>{
    const data=makeDemo();
    data.activities=[
      {...normalizeForTest('early','2026-10-19',4000),start:'2026-10-19T07:00:00',duration:3600,elapsed:null},
      {...normalizeForTest('late','2026-10-19',8000),start:'2026-10-19T17:00:00',duration:3600,elapsed:null},
      {...normalizeForTest('now','2026-10-26',5000),start:'2026-10-26T07:00:00',duration:3600,elapsed:null},
    ];
    expect(weekStats(data,'2026-10-26','12:00:00').previousDistance).toBe(4000);
    expect(weekStats(data,'2026-10-26','18:00:00').previousDistance).toBe(12000);
  });
  it('preserves missing calendar dates so charts cannot bridge absent nights',()=>{
    const data=makeDemo();const today=todayKey(data.preferences.timezone);
    data.daily=[{date:addDays(today,-2),hrv:50,source:'garmin'},{date:today,hrv:55,source:'garmin'}];
    const rows=recentDaily(data,3);
    expect(rows.map(d=>d.date)).toEqual([addDays(today,-2),addDays(today,-1),today]);
    expect(rows[1].source).toBe('missing');expect(rows[1].hrv).toBeUndefined();
  });
  it('reports zone coverage rather than filling missing time with easy effort',()=>{
    const a=normalizeForTest('a','2026-10-26',5000);a.duration=3600;a.zones=[0,900,null,null,null];
    const result=zoneTotals([a]);expect(result.minutes).toBe(15);expect(result.coverage).toBe(25);
  });
  it('does not generate sleep conclusions without sufficient baseline',()=>{
    const data=makeDemo();data.activities=[];data.daily=data.daily.slice(-8);
    expect(insightsFor(data).some(i=>i.id==='sleep-context')).toBe(false);
  });
  it('never formats an absent pace as zero',()=>{expect(formatPace(null)).toBe('—');expect(formatPace(0)).toBe('—');expect(formatPace(1000/300)).toBe('5:00');});
  it('keeps demo and real-source labeling explicit',()=>{const d=makeDemo();expect(d.mode).toBe('demo');expect(d.activities.every(a=>a.source==='demo')).toBe(true);});
});
