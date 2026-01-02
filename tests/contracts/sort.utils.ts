export function isSorted<T>(
  arr: T[],
  key: (item: T) => string | number,
  direction: 'asc' | 'desc' = 'asc'
) {
  for (let i = 1; i < arr.length; i++) {
    const prev = key(arr[i - 1]);
    const curr = key(arr[i]);

    if (direction === 'asc' && prev > curr) return false;
    if (direction === 'desc' && prev < curr) return false;
  }
  return true;
}