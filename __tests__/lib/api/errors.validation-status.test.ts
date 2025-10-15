import { createErrorResponse, ValidationError } from '@/lib/api/errors'

describe('ValidationError HTTP status code', () => {
  it('returns 422 Unprocessable Entity for validation failures', () => {
    const err = new ValidationError('입력값이 올바르지 않습니다: width_cm - 허용 범위 30–300')
    const res = createErrorResponse(err)
    expect(res.status).toBe(422)
  })
})

