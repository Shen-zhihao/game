import { useState } from 'react';
import { Text, View } from 'react-native';
import { BagButton, bagStyles } from '../../components/BagBrowser';
import { sellPrice, sellReason } from '../../game/cityServices';
import type { GameState } from '../../game/model';

export function SellPanel({
  game,
  itemId,
  onSell,
}: {
  game: GameState;
  itemId: string;
  onSell: (quantity: number) => void;
}) {
  const maximum = Math.min(99, game.inventory[itemId] ?? 0);
  const [amount, setAmount] = useState(1);
  const [quote, setQuote] = useState<{ quantity: number; stock: number; money: number } | null>(
    null,
  );
  const quantity = Math.max(1, Math.min(amount, maximum));
  const reason = sellReason(game, itemId, quantity);
  const currentQuote =
    quote &&
    quote.quantity === quantity &&
    quote.stock === game.inventory[itemId] &&
    quote.money === game.player.money;
  const changeAmount = (value: number) => {
    setAmount(value);
    setQuote(null);
  };
  return (
    <View testID="sell-panel" style={{ gap: 5 }}>
      {!currentQuote && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <BagButton
            testID="sell-quantity-minus"
            disabled={quantity <= 1}
            onPress={() => changeAmount(quantity - 1)}
          >
            减少
          </BagButton>
          <BagButton
            testID="sell-quantity-plus"
            disabled={quantity >= maximum}
            onPress={() => changeAmount(quantity + 1)}
          >
            增加
          </BagButton>
          <BagButton
            testID="sell-max"
            disabled={quantity >= maximum}
            onPress={() => changeAmount(maximum)}
          >{`最多 ${maximum}`}</BagButton>
        </View>
      )}
      {currentQuote ? (
        <>
          <Text
            testID="sell-quote"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={bagStyles.text}
          >{`出售 ${quantity} 个 · 获得 ◎${sellPrice(itemId) * quantity}`}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <BagButton
              primary
              testID="sell-confirm"
              disabled={!!reason}
              onPress={() => {
                onSell(quantity);
                setQuote(null);
                setAmount(1);
              }}
            >
              确认出售
            </BagButton>
            <BagButton testID="sell-cancel" onPress={() => setQuote(null)}>
              取消
            </BagButton>
          </View>
        </>
      ) : (
        <BagButton
          primary
          testID="sell-preview"
          disabled={!!reason}
          onPress={() =>
            setQuote({ quantity, stock: game.inventory[itemId] ?? 0, money: game.player.money })
          }
        >
          {reason ?? `预览出售 ${quantity} 个 · ◎${sellPrice(itemId) * quantity}`}
        </BagButton>
      )}
    </View>
  );
}
