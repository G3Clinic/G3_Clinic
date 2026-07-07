import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Hemácias', value: 400 },
  { name: 'Plasma', value: 300 },
  { name: 'Plaquetas', value: 300 },
  { name: 'Crioprecipitado', value: 200 },
];

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

// Calcula o total para a porcentagem
const total = data.reduce((sum, item) => sum + item.value, 0);

// Tooltip customizado para mostrar a porcentagem
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0];
    const percentage = ((dataItem.value / total) * 100).toFixed(1);

    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
        <p className="font-bold text-slate-700 mb-1">{dataItem.name}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dataItem.payload.fill }}></span>
          <span className="text-slate-500">Qtd: <b className="text-slate-800">{dataItem.value}</b></span>
        </div>
        <div className="mt-1 pt-1 border-t border-gray-100 text-right">
          <span className="font-bold text-brand-red">{percentage}%</span> <span className="text-slate-400">do total</span>
        </div>
      </div>
    );
  }
  return null;
};

export function StockDistributionChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#64748b' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}