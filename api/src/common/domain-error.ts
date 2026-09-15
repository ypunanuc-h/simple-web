/** Error ของ domain ไม่รู้จัก HTTP ตาม CLAUDE.md §5.2 */
export class ResourceNotFoundError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} ${id} not found`);
    this.name = 'ResourceNotFoundError';
  }
}
