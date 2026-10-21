import request from './request.js'
import { isMockMode, paginate, readMockList, writeMockList } from './mockStorage.js'
import { getBook, saveBook } from './book.js'

const storageKey = 'novel_admin_chapters'
const chapterList = [
  { id: 1, bookId: 1, number: 1, title: '第一章 修仙之路', wordCount: 2600, isFree: true, publishTime: '2024-11-10' },
  { id: 2, bookId: 1, number: 2, title: '第二章 试炼洞府', wordCount: 3240, isFree: true, publishTime: '2024-11-12' },
  { id: 3, bookId: 1, number: 3, title: '第三章 争锋论剑', wordCount: 4120, isFree: false, publishTime: '2024-11-15' },
  { id: 4, bookId: 2, number: 1, title: '第一章 天才少年', wordCount: 2980, isFree: true, publishTime: '2024-10-08' }
]

export const getChapters = async (bookId = 1, params = {}) => {
  if (!isMockMode) {
    const response = await request.get('/chapters')
    const chapters = response.data
      .filter((chapter) => Number(chapter.bookId) === Number(bookId))
      .sort((a, b) => Number(a.chapterNum) - Number(b.chapterNum))
      .map(toChapterViewModel)
    return { ...response, data: paginate(chapters, params.page, params.pageSize) }
  }

  const chapters = readMockList(storageKey, chapterList)
    .filter((item) => !bookId || item.bookId === Number(bookId))
    .sort((a, b) => a.number - b.number)
  return { code: 0, message: 'success', data: paginate(chapters, params.page, params.pageSize) }
}

export const getChapter = async (id) => {
  if (!isMockMode) {
    const response = await request.get(`/chapters/${id}`)
    return { ...response, data: toChapterViewModel(response.data) }
  }

  const chapter = readMockList(storageKey, chapterList).find((item) => item.id === Number(id))
  return { code: 0, message: 'success', data: chapter || null }
}

export const saveChapter = async (payload) => {
  if (!isMockMode) {
    return request.put(`/chapters/${payload.id}`, {
      bookId: Number(payload.bookId),
      chapterNum: Number(payload.number),
      title: payload.title,
      content: payload.content || '',
      wordCount: Number(payload.wordCount) || 0,
      isFree: payload.isFree ? 1 : 0
    })
  }

  const chapters = readMockList(storageKey, chapterList)
  const index = chapters.findIndex((item) => item.id === Number(payload.id))
  if (index < 0) throw new Error('章节不存在或已被删除')
  const previousChapter = chapters[index]
  chapters[index] = {
    ...chapters[index],
    ...payload,
    wordCount: Number(payload.wordCount) || 0
  }
  writeMockList(storageKey, chapters)
  if (previousChapter.bookId === chapters[index].bookId) {
    const book = (await getBook(previousChapter.bookId)).data
    if (book) {
      await saveBook({
        ...book,
        wordCount: Math.max(
          0,
          (Number(book.wordCount) || 0)
            + (Number(chapters[index].wordCount) || 0)
            - (Number(previousChapter.wordCount) || 0)
        )
      })
    }
  }
  return { code: 0, message: '更新成功', data: chapters[index] }
}

export const uploadChapters = async (payload) => {
  if (!isMockMode) {
    return request.post('/chapters/batch', {
      bookId: Number(payload.bookId),
      isFree: payload.isFree ? 1 : 0,
      chapters: payload.chapters.map((chapter) => ({
        chapterNum: Number(chapter.number),
        title: chapter.title,
        content: chapter.content,
        wordCount: Number(chapter.wordCount) || 0
      }))
    })
  }

  const chapters = payload.chapters || []
  if (!chapters.length) throw new Error('没有可导入的章节')
  const storedChapters = readMockList(storageKey, chapterList)
  const currentNumbers = new Set(storedChapters
    .filter((chapter) => chapter.bookId === Number(payload.bookId))
    .map((chapter) => Number(chapter.number)))
  const seenNumbers = new Set(currentNumbers)
  const duplicates = []
  chapters.forEach((chapter) => {
    const number = Number(chapter.number)
    if (seenNumbers.has(number)) duplicates.push(chapter)
    seenNumbers.add(number)
  })
  if (duplicates.length) throw new Error(`章节序号重复：${duplicates.map((chapter) => chapter.number).join('、')}`)
  const book = (await getBook(payload.bookId)).data
  if (!book) throw new Error('请选择有效书籍')
  chapters.forEach((chapter, index) => {
    storedChapters.push({
      id: Date.now() + index,
      bookId: payload.bookId,
      number: chapter.number,
      title: chapter.title,
      wordCount: chapter.wordCount,
      isFree: payload.isFree !== false,
      publishTime: new Date().toISOString().split('T')[0]
    })
  })

  writeMockList(storageKey, storedChapters)
  await saveBook({
    ...book,
    chapterCount: (Number(book.chapterCount) || 0) + chapters.length,
    wordCount: (Number(book.wordCount) || 0) + chapters.reduce((sum, chapter) => sum + (Number(chapter.wordCount) || 0), 0)
  })
  return { code: 0, message: '批量导入成功', data: chapters }
}

export const deleteChapter = async (id) => {
  if (!isMockMode) return request.delete(`/chapters/${id}`)

  const chapters = readMockList(storageKey, chapterList)
  const removedChapter = chapters.find((item) => item.id === Number(id))
  const nextChapters = chapters.filter((item) => item.id !== Number(id))
  if (nextChapters.length === chapters.length) throw new Error('章节不存在或已被删除')
  writeMockList(storageKey, nextChapters)
  const book = (await getBook(removedChapter.bookId)).data
  if (book) {
    await saveBook({
      ...book,
      chapterCount: Math.max(0, (Number(book.chapterCount) || 0) - 1),
      wordCount: Math.max(0, (Number(book.wordCount) || 0) - (Number(removedChapter.wordCount) || 0))
    })
  }
  return { code: 0, message: '删除成功', data: { id } }
}

const toChapterViewModel = (chapter) => ({
  ...chapter,
  bookId: Number(chapter.bookId),
  number: Number(chapter.chapterNum),
  isFree: Number(chapter.isFree) === 1,
  publishTime: chapter.publishedAt ? String(chapter.publishedAt).slice(0, 10) : ''
})
