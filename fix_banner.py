with open('src/pages/Messages.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
for i, line in enumerate(lines):
    if "{selectedMessage.assignment_status === 'ASSIGNED' && selectedMessage.technicians && (" in line:
        start_idx = i
        break

if start_idx != -1:
    end_idx = start_idx
    for i in range(start_idx, len(lines)):
        if "</div>" in lines[i] and "</div>" in lines[i-1] and ")} " not in lines[i]:
            if ")} " in lines[i+1] or ")}" in lines[i+1]:
                end_idx = i+1
                break

    if end_idx != start_idx:
        new_banner = """              {selectedMessage.assignment_status === 'ASSIGNED' && selectedMessage.technician_ids && selectedMessage.technician_ids.length > 0 && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2 flex flex-col gap-3 border-t border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Prévu le : {new Date(selectedMessage.scheduled_at!).toLocaleDateString('fr-FR')} à {selectedMessage.scheduled_at!.split('T')[1].substring(0,5)} • <span className="font-bold text-amber-600 dark:text-amber-500">{selectedMessage.priority === 'HIGH' ? 'HAUTE' : selectedMessage.priority === 'URGENT' ? 'URGENTE' : 'NORMALE'}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Équipe assignée :</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMessage.technician_ids.map(techId => {
                          const tech = technicians.find(t => t.id === techId);
                          if (!tech) return null;
                          return (
                            <div key={tech.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                               <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
                                 {tech.first_name?.[0] || ''}{tech.last_name?.[0] || ''}
                               </div>
                               <div>
                                 <p className="text-xs font-medium">{tech.first_name} {tech.last_name}</p>
                                 <p className="text-[10px] text-gray-500">{tech.phone}</p>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
"""
        lines = lines[:start_idx] + [new_banner] + lines[end_idx+1:]
        
        with open('src/pages/Messages.tsx', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Replaced banner!")
    else:
        print("Banner end not found")
else:
    print("Banner start not found")

