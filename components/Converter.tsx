'use client'
import { useState, useEffect } from "react"
import { Input } from "./ui/input"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

const Converter = ({ symbol, icon, priceList }:ConverterProps) => {

    const [currency, setCurrency] = useState<string>('usd')
    const [amount, setAmount] = useState<string>('10')
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const convertedPrice = (parseFloat(amount) || 0) * (priceList[currency] || 0);


    return (
        <div id="converter">
            <h4>{symbol.toUpperCase()} Converter</h4>
            <div className="panel">
                <div className="input-wrapper">
                    <Input 
                        type="number" 
                        placeholder="Amount"
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        className="input"
                    />
                    <div className="coin-info">
                        <Image src={icon} alt={symbol} width={20} height={20} />
                        <p>{symbol.toUpperCase()}</p>
                    </div>
                </div>
                <div className="divider">
                    <div className="line" />
                    <Image src="/converter.svg" alt="Converter" width={32} height={32} />

                </div>
                <div className="output-wrapper">
                    <p>{isClient ? formatCurrency(convertedPrice, 2, currency, false) : '0.00'}</p>
                    <Select value={currency} onValueChange={(value) => setCurrency(value)}>
                        <SelectTrigger className="select-trigger" value={currency}>
                            <SelectValue placeholder="Select" className="select-value">
                                {currency.toUpperCase()}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="select-content" data-converter>
                            {Object.keys(priceList).map((currencyCode) => (
                                <SelectItem value={currencyCode} key={currencyCode} className="select-item">
                                    {currencyCode.toUpperCase()}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}

export default Converter