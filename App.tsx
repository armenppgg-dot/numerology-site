import { useMemo, useState } from 'react';

type Interpretation = {
  title: string;
  text: string[];
};

const INTERPRETATIONS: Record<number, Interpretation> = {
  1: {
    title: '1 — Лидер пути',
    text: ['Ваша энергия — лидерство, самостоятельность и смелость начинать первым.']
  },
  2: {
    title: '2 — Создатель гармонии',
    text: ['Ваш путь связан с партнёрством, тонкой чувствительностью и балансом.']
  },
  3: {
    title: '3 — Создатель вдохновения',
    text: ['Вы раскрываетесь через творчество, самовыражение и контакт с людьми.']
  },
  4: {
    title: '4 — Архитектор судьбы',
    text: ['Сила четвёрки — структура, стабильность и умение доводить до результата.']
  },
  5: {
    title: '5 — Энергия свободы и перемен',
    text: ['Ваш ресурс — движение, опыт, гибкость и расширение горизонтов.']
  },
  6: {
    title: '6 — Сердце и ответственность',
    text: ['Вы создаёте заботу и гармонию, когда держите баланс между собой и другими.']
  },
  7: {
    title: '7 — Искатель истины',
    text: ['Ваш путь — глубина, анализ, духовность и внутренняя честность.']
  },
  8: {
    title: '8 — Реализация и сила',
    text: ['Вы способны управлять ресурсами и реализовывать масштабные задачи.']
  },
  9: {
    title: '9 — Миссия души',
    text: ['Ваш дар — сострадание, помощь людям и интуитивная мудрость.']
  },
  11: {
    title: '11 — Пробуждение',
    text: ['Мастер-число интуиции, вдохновения и духовного видения.']
  },
  22: {
    title: '22 — Мастер-строитель',
    text: ['Число больших проектов, масштаба и созидательной ответственности.']
  },
  33: {
    title: '33 — Мастер-сострадание',
    text: ['Энергия исцеления и безусловной любви при бережном отношении к себе.']
  }
};

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const sumDigits = (value: string | number): number =>
  String(value).split('').reduce((sum, digit) => sum + Number(digit), 0);

const calculateLifePath = (day: number, month: number, year: number): number => {
  let total = sumDigits(`${day}${month}${year}`);
  while (total > 9 && ![11, 22, 33].includes(total)) {
    total = sumDigits(total);
  }
  return total;
};

export default function App() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [number, setNumber] = useState<number | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1899 }, (_, i) => current - i);
  }, []);

  const interpretation = number ? INTERPRETATIONS[number] : null;

  const onCalculate = () => {
    if (!day || !month || !year) return;
    setNumber(calculateLifePath(Number(day), Number(month), Number(year)));
  };

  return (
    <main>
      <h1>Дарья Погосян — нумеролог и психолог</h1>
      <div>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">Месяц</option>
          {MONTHS.map((item, index) => (
            <option key={item} value={index + 1}>{item}</option>
          ))}
        </select>
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">День</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Год</option>
          {years.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
      <button type="button" onClick={onCalculate}>Получить расшифровку</button>
      {interpretation && (
        <article>
          <h2>{interpretation.title}</h2>
          {interpretation.text.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </article>
      )}
    </main>
  );
}
