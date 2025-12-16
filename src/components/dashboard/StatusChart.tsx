import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AnimeStatus } from '@/types/anime';
import { statusLabels } from '@/data/mockData';

interface StatusChartProps {
  data: Record<AnimeStatus, number>;
}

const COLORS = {
  watching: 'hsl(183, 100%, 50%)',
  completed: 'hsl(142, 76%, 45%)',
  paused: 'hsl(38, 92%, 50%)',
  dropped: 'hsl(0, 84%, 60%)',
  planned: 'hsl(270, 80%, 60%)',
};

export function StatusChart({ data }: StatusChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: statusLabels[status as AnimeStatus],
      value,
      color: COLORS[status as AnimeStatus],
    }));

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="font-display text-lg font-semibold mb-4">Por Status</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 10%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 98%)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
