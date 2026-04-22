import { motion } from 'motion/react';
import { Lightbulb, CheckCircle2, Target, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KaizenViewProps {
  trainee: any;
  kaizenData: any;
}

export default function KaizenView({
  trainee,
  kaizenData
}: KaizenViewProps) {
  // Verificação de segurança para evitar erros de 'undefined' na matrícula
  if (!trainee) return null;

  // No novo formato, kaizenData já vem processado e filtrado para o trainee atual
  const currentData = kaizenData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-subtle">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-content uppercase tracking-tight">Central de Kaizen</h2>
        </div>

        {currentData && currentData.resumo ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-background rounded-2xl p-6 border border-border-subtle flex items-center gap-4 group hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shadow-sm">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-content-muted font-bold uppercase tracking-widest mb-0.5">Submetidos</p>
                  <p className="text-3xl font-black text-content tabular-nums leading-none">{currentData.resumo.submetidos}</p>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-6 border border-border-subtle flex items-center gap-4 group hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-content-muted font-bold uppercase tracking-widest mb-0.5">Implementados</p>
                  <p className="text-3xl font-black text-content tabular-nums leading-none">{currentData.resumo.implementados}</p>
                </div>
              </div>
              <div className="bg-background rounded-2xl p-6 border border-border-subtle flex items-center gap-4 group hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-content-muted font-bold uppercase tracking-widest mb-0.5">Taxa de Sucesso</p>
                  <p className="text-3xl font-black text-content tabular-nums leading-none">
                    {currentData.resumo.submetidos > 0 
                      ? Math.round((currentData.resumo.implementados / currentData.resumo.submetidos) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-background rounded-[24px] p-6 border border-border-subtle">
                <h3 className="text-xs font-black text-content mb-8 flex items-center gap-2 uppercase tracking-widest opacity-60">
                  <TrendingUp className="w-4 h-4" />
                  Evolução Mensal
                </h3>
                <div className="h-[250px] w-full focus:outline-none">
                  <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
                    <BarChart
                      data={currentData.evolucaoMensal && currentData.evolucaoMensal.length > 0 
                        ? currentData.evolucaoMensal 
                        : [{ month: 'Jan', submetidos: 0, implementados: 0 }]
                      }
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                      barGap={8}
                      style={{ outline: 'none' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.4} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                      <Tooltip 
                        shared={false}
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', outline: 'none' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', outline: 'none' }} />
                      <Bar dataKey="submetidos" name="Submetidos" fill="#93c5fd" radius={[6, 6, 0, 0]} maxBarSize={40} style={{ outline: 'none' }} />
                      <Bar dataKey="implementados" name="Implementados" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} style={{ outline: 'none' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-background rounded-[24px] p-6 border border-border-subtle">
                <h3 className="text-xs font-black text-content mb-6 uppercase tracking-widest opacity-60">Últimos Registros</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentData.ultimosRegistros && currentData.ultimosRegistros.length > 0 ? (
                    currentData.ultimosRegistros.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl border border-border-subtle hover:border-blue-200 transition-all bg-surface hover:shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-[11px] font-bold text-content line-clamp-2 leading-tight uppercase tracking-tight">{item.title}</h4>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[9px] font-bold text-content-muted flex items-center gap-1 opacity-60">
                            <Calendar className="w-3 h-3" /> {item.date.includes('-') ? format(parseISO(item.date), "dd MMM", { locale: ptBR }) : item.date}
                          </span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                            item.status === 'Implementado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-content-muted font-medium text-center py-8">Sem registros recentes.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-900 rounded-[28px] flex items-center justify-center mb-6 shadow-sm border border-border-subtle">
              <Lightbulb className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-content mb-2 tracking-tight">NENHUM KAIZEN ENCONTRADO</h3>
            <p className="text-sm font-medium text-content-muted max-w-xs leading-relaxed">
              Não identificamos registros de sugestões Kaizen vinculados a esta matrícula no banco de dados.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
