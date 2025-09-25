import { cn, formatDate } from '@/utils'

describe('유틸리티 함수들', () => {
  describe('cn 함수', () => {
    it('클래스 이름들을 올바르게 합성한다', () => {
      expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3')
    })

    it('falsy 값들을 필터링한다', () => {
      expect(cn('class1', null, undefined, false, 'class2')).toBe('class1 class2')
    })

    it('빈 문자열을 처리한다', () => {
      expect(cn('')).toBe('')
      expect(cn('', 'class1')).toBe('class1')
    })
  })

  describe('formatDate 함수', () => {
    it('Date 객체를 한국어 형식으로 포맷한다', () => {
      const date = new Date('2025-09-25')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/\d{4}\. \d{1,2}\. \d{1,2}\./)
    })

    it('날짜 문자열을 한국어 형식으로 포맷한다', () => {
      const formatted = formatDate('2025-09-25')
      expect(formatted).toMatch(/\d{4}\. \d{1,2}\. \d{1,2}\./)
    })
  })
})