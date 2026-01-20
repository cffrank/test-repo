import { describe, it, expect } from 'vitest'
import { parseCostCsv } from '../parsers/csvParser'

describe('CSV Parser', () => {
    it('parses valid CSV correctly', () => {
        const csv = `Service,Amount,Date
AmazonEC2,120.50,2023-10-01
AmazonS3,5.00,2023-10-02`

        const result = parseCostCsv(csv)
        expect(result).toHaveLength(2)
        expect(result[0].service).toBe('AmazonEC2')
        expect(result[0].amount).toBe(120.50)
    })

    it('handles empty input gracefully', () => {
        const result = parseCostCsv('')
        expect(result).toEqual([])
    })
})
