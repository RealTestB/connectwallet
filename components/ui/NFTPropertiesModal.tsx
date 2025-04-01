import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../../styles/shared';
import { NFT, NFTAttribute } from '../../api/nftsApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NFTPropertiesModalProps {
  isVisible: boolean;
  onClose: () => void;
  nft: NFT;
}

const MODAL_HEIGHT = Dimensions.get('window').height * 0.7;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TRAIT_CARD_WIDTH = (SCREEN_WIDTH - (SPACING.lg * 3)) / 2; // 2 columns with padding

export default function NFTPropertiesModal({ isVisible, onClose, nft }: NFTPropertiesModalProps) {
  const insets = useSafeAreaInsets();
  const [isClosing, setIsClosing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const [activeTab, setActiveTab] = useState<'traits' | 'details'>('details');

  React.useEffect(() => {
    if (isVisible && !isClosing) {
      setIsClosing(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 5,
      }).start();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsClosing(false);
      onClose();
    });
  }, [onClose]);

  const renderTraitCard = (trait: NFTAttribute) => (
    <View key={`${trait.trait_type}-${trait.value}`} style={styles.traitCard}>
      <Text style={styles.traitType}>{trait.trait_type}</Text>
      <Text style={styles.traitValue}>{trait.value}</Text>
      {trait.rarity && (
        <Text style={styles.traitRarity}>{trait.rarity.toFixed(1)}% have this trait</Text>
      )}
    </View>
  );

  const renderTraits = () => {
    if (!nft.attributes || nft.attributes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No traits found for this NFT</Text>
        </View>
      );
    }

    return (
      <View style={styles.traitsGrid}>
        {nft.attributes.map(renderTraitCard)}
      </View>
    );
  };

  const renderDetails = () => {
    const properties = [
      { label: 'Contract Address', value: nft.contract.address },
      { label: 'Token ID', value: nft.tokenId },
      { label: 'Token Type', value: nft.tokenType },
      { label: 'Contract Name', value: nft.contract.name || 'N/A' },
      { label: 'Contract Symbol', value: nft.contract.symbol || 'N/A' },
      { label: 'Total Supply', value: nft.contract.totalSupply || 'N/A' },
      { label: 'Last Updated', value: new Date(nft.timeLastUpdated).toLocaleString() },
    ];

    return properties.map((prop, index) => (
      <View key={index} style={styles.propertyRow}>
        <Text style={styles.propertyLabel}>{prop.label}</Text>
        <Text style={styles.propertyValue}>{prop.value}</Text>
      </View>
    ));
  };

  if (!isVisible && !isClosing) return null;

  return (
    <Modal
      transparent
      visible={isVisible || isClosing}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <Image
                source={require('../../assets/images/background.png')}
                style={styles.backgroundImage}
              />
              
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'traits' && styles.activeTab]}
                  onPress={() => setActiveTab('traits')}
                >
                  <Text style={[styles.tabText, activeTab === 'traits' && styles.activeTabText]}>
                    Traits
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                  onPress={() => setActiveTab('details')}
                >
                  <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                    Details
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {activeTab === 'traits' ? renderTraits() : renderDetails()}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: -1,
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    zIndex: -1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  traitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  traitCard: {
    width: TRAIT_CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  traitType: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  traitValue: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: '600',
  },
  traitRarity: {
    ...FONTS.caption,
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  propertyLabel: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  propertyValue: {
    ...FONTS.body,
    color: COLORS.white,
    maxWidth: '60%',
    textAlign: 'right',
  },
}); 