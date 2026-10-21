import request from './request.js'
import { isMockMode, paginate, readMockList, writeMockList } from './mockStorage.js'

const storageKey = 'novel_admin_books'
const bookList = [
  { id: 1, cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80', title: '修仙狂龙', author: '青山小白', category: '修真', wordCount: 182000, chapterCount: 128, status: '连载中', rating: 9.4, vip: true, chapterPrice: 3, freeChapterCount: 3 },
  { id: 2, cover: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=300&q=80', title: '都市最强医圣', author: '小刀锋利', category: '都市', wordCount: 266000, chapterCount: 200, status: '已完结', rating: 9.8, vip: false, chapterPrice: 2, freeChapterCount: 5 },
  { id: 3, cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=300&q=80', title: '星辰猎人', author: '月照长空', category: '科幻', wordCount: 154000, chapterCount: 114, status: '连载中', rating: 9.1, vip: true, chapterPrice: 4, freeChapterCount: 2 },
  { id: 4, cover: 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=300&q=80', title: '江湖无双', author: '清风入梦', category: '武侠', wordCount: 212000, chapterCount: 180, status: '连载中', rating: 9.5, vip: true, chapterPrice: 5, freeChapterCount: 4 }
]

export const getBooks = async (params = {}) => {
  if (!isMockMode) {
    const [response, categoryResponse] = await Promise.all([
      request.get('/books'),
      import('./category.js').then(({ getCategories }) => getCategories())
    ])
    const categoryNames = new Map(categoryResponse.data.map((item) => [Number(item.id), item.name]))
    const books = response.data.map((book) => toBookViewModel(book, categoryNames))
    const keyword = (params.keyword || '').trim().toLowerCase()
    const filtered = books.filter((book) => {
      const matchesKeyword = !keyword || book.title.toLowerCase().includes(keyword) || book.author.toLowerCase().includes(keyword)
      const matchesCategory = !params.category || params.category === '全部' || book.category === params.category
      return matchesKeyword && matchesCategory
    })
    return { ...response, data: paginate(filtered, params.page, params.pageSize) }
  }

  const keyword = (params.keyword || '').trim().toLowerCase()
  const books = readMockList(storageKey, bookList)
  const filtered = books.filter((book) => {
    const matchesKeyword = !keyword || book.title.toLowerCase().includes(keyword) || book.author.toLowerCase().includes(keyword)
    const matchesCategory = !params.category || params.category === '全部' || book.category === params.category
    return matchesKeyword && matchesCategory
  })

  return {
    code: 0,
    message: 'success',
    data: paginate(filtered, params.page, params.pageSize)
  }
}

export const getBook = async (id) => {
  if (!isMockMode) {
    const [response, categoryResponse] = await Promise.all([
      request.get(`/books/${id}`),
      import('./category.js').then(({ getCategories }) => getCategories())
    ])
    const categoryNames = new Map(categoryResponse.data.map((item) => [Number(item.id), item.name]))
    return { ...response, data: toBookViewModel(response.data, categoryNames) }
  }

  const book = readMockList(storageKey, bookList).find((item) => item.id === Number(id))
  return { code: 0, message: 'success', data: book ? { ...book, categoryId: book.category } : null }
}

export const saveBook = async (payload) => {
  if (!isMockMode) {
    const apiPayload = toBookPayload(payload)
    return payload.id
      ? request.put(`/books/${payload.id}`, apiPayload)
      : request.post('/books', apiPayload)
  }

  const books = readMockList(storageKey, bookList)
  const mockPayload = { ...payload, category: payload.categoryId || payload.category }
  if (payload.id) {
    const index = books.findIndex((item) => item.id === Number(payload.id))
    if (index < 0) throw new Error('书籍不存在或已被删除')
    books[index] = { ...books[index], ...mockPayload }
    writeMockList(storageKey, books)
    return { code: 0, message: '编辑成功', data: books[index] }
  }

  const newBook = {
    ...mockPayload,
    id: Date.now(),
    cover: payload.cover || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80',
    wordCount: Number(payload.wordCount) || 0,
    chapterCount: Number(payload.chapterCount) || 0,
    rating: Number(payload.rating) || 0
  }
  books.unshift(newBook)
  writeMockList(storageKey, books)
  return { code: 0, message: '新增成功', data: newBook }
}

export const deleteBook = async (id) => {
  if (!isMockMode) return request.delete(`/books/${id}`)

  const books = readMockList(storageKey, bookList)
  const nextBooks = books.filter((item) => item.id !== Number(id))
  if (nextBooks.length === books.length) throw new Error('书籍不存在或已被删除')
  writeMockList(storageKey, nextBooks)
  return { code: 0, message: '删除成功', data: { id } }
}

export const getBookOptions = async () => {
  const { getCategories } = await import('./category.js')
  const categories = await getCategories()
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: categories.data
      .filter((item) => item.status === '启用')
      .map((item) => ({ id: isMockMode ? item.name : Number(item.id), label: item.name, value: item.name }))
  })
}

const toBookViewModel = (book, categoryNames) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  categoryId: Number(book.categoryId),
  category: categoryNames.get(Number(book.categoryId)) || '',
  cover: book.coverUrl || '',
  intro: book.description || '',
  tags: typeof book.tags === 'string' && book.tags ? book.tags.split(',') : [],
  wordCount: Number(book.wordCount) || 0,
  chapterCount: Number(book.chapterCount) || 0,
  status: Number(book.status) === 2 ? '已完结' : '连载中',
  vip: Number(book.isVip) === 1,
  chapterPrice: Number(book.pricePerChapter) || 0,
  freeChapterCount: Number(book.freeChapters) || 0,
  rating: Number(book.score) || 0
})

const toBookPayload = (book) => ({
  categoryId: Number(book.categoryId),
  title: book.title,
  author: book.author,
  coverUrl: book.cover || '',
  description: book.intro || '',
  tags: Array.isArray(book.tags) ? book.tags.join(',') : (book.tags || ''),
  wordCount: Number(book.wordCount) || 0,
  chapterCount: Number(book.chapterCount) || 0,
  status: book.status === '已完结' ? 2 : 1,
  isVip: book.vip ? 1 : 0,
  pricePerChapter: Number(book.chapterPrice) || 0,
  freeChapters: Number(book.freeChapterCount) || 0,
  score: Number(book.rating) || 0
})
