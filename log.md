## Error Type
Console Error

## Error Message
storageService.create(ai_chat_sessions): "Could not find the 'student_name' column of 'ai_chat_sessions' in the schema cache"


    at Object.create (src/lib/storage-service.ts:38:26)
    at async ensureSession (src/app/student/chat/page.tsx:117:23)
    at async handleSendMessage (src/app/student/chat/page.tsx:155:23)

## Code Frame
  36 |   create: async <T extends { id: string }>(table: string, item: Omit<T, 'id'>): Promise<T> => {
  37 |     const { data, error } = await supabase.from(table).insert(toSnakeCase(item as any)).select().single();
> 38 |     if (error) { console.error(`storageService.create(${table}):`, error.message); throw error; }
     |                          ^
  39 |     return toCamelCase<T>(data);
  40 |   },
  41 |

Next.js version: 15.5.9 (Turbopack)
