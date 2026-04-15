import { motion } from 'motion/react';
import { Lightbulb, CheckCircle2, Target, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KaizenViewProps {
  selectedTrainee: any;
  kaizenData: any;
}

export default function KaizenView({
  selectedTrainee,
  kaizenData
}: KaizenViewProps) {
  const currentData = kaizenData[selectedTrainee.matricula];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-subtle">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-content">Central de Kaizen - {selectedTrainee.name}</h2>
          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            Dados Reais
          </span>
        </div>

        {currentData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-content-muted font-medium">Total Submetidos</p>
                  <p className="text-2xl font-bold text-content">{currentData.resumo.submetidos}</p>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-content-muted font-medium">Implementados</p>
                  <p className="text-2xl font-bold text-content">{currentData.resumo.implementados}</p>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-content-muted font-medium">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-content">
                    {Math.round((currentData.resumo.implementados / currentData.resumo.submetidos) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-background rounded-2xl p-5 border border-border-subtle">
                <h3 className="text-sm font-bold text-content mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-content-muted" />
                  Evolução Mensal
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={currentData.evolucaoMensal}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="submetidos" name="Submetidos" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="implementados" name="Implementados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-background rounded-2xl p-5 border border-border-subtle">
                <h3 className="text-sm font-bold text-content mb-4">Últimos Registros</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentData.ultimosRegistros.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-border-subtle hover:border-blue-200 transition-colors bg-surface">
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-xs font-bold text-content line-clamp-2 leading-tight">{item.title}</h4>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-content-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(parseISO(item.date), "dd MMM", { locale: ptBR })}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'Implementado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-content mb-2">Nenhum Kaizen Encontrado</h3>
            <p className="text-content-muted max-w-md">
              Este colaborador ainda não possui registros de Kaizen no sistema.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
