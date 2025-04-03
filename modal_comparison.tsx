import React, { useState, useCallback } from 'react';
import { Modal, View, Animated, TouchableWithoutFeedback, Image } from 'react-native';

const MODAL_HEIGHT = 400; // Example height, adjust as needed

// Settings Page Modal Implementation
const SettingsModal = () => {
  const [isClosing, setIsClosing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(MODAL_HEIGHT)).current;

  // Animation effect
  React.useEffect(() => {
    if ((showLanguagePicker || showCurrencyPicker || showNetworkPicker) && !isClosing) {
      setIsClosing(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 5,
      }).start();
    }
  }, [showLanguagePicker, showCurrencyPicker, showNetworkPicker]);

  // Close modal with animation
  const handleCloseModal = useCallback(() => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsClosing(false);
      setShowLanguagePicker(false);
      setShowCurrencyPicker(false);
      setShowNetworkPicker(false);
    });
  }, []);

  return (
    <Modal
      transparent
      visible={(showLanguagePicker || showCurrencyPicker || showNetworkPicker) || isClosing}
      onRequestClose={handleCloseModal}
    >
      <TouchableWithoutFeedback onPress={handleCloseModal}>
        <View style={styles.modalOverlay}>
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
                source={require('../assets/background.png')}
                style={styles.modalBackground}
              />
              {/* Modal content */}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Portfolio Page Modal Implementation
const PortfolioModal = () => {
  return (
    <Modal
      transparent
      visible={showNetworkPicker}
      onRequestClose={handleCloseModal}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            {/* Modal content */}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Key Differences:
// 1. Settings modal uses custom animation with Animated.View and slideAnim
// 2. Settings modal has isClosing state to handle animation
// 3. Settings modal uses TouchableWithoutFeedback for backdrop press
// 4. Settings modal includes background image
// 5. Portfolio modal uses native "slide" animation
// 6. Portfolio modal has simpler structure without animation handling
// 7. Settings modal visible prop includes isClosing state 