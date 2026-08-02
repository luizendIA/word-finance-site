(function () {
  "use strict";

  const phone = "5535998140638";
  const ageGate = document.getElementById("ageGate");
  const acceptAge = document.getElementById("acceptAge");
  const productCards = Array.from(document.querySelectorAll(".product-card"));
  const orderSummary = document.getElementById("orderSummary");
  const orderTotal = document.getElementById("orderTotal");
  const sendOrder = document.getElementById("sendOrder");

  function whatsappLink(message) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  document.querySelectorAll("[data-whatsapp]").forEach(function (link) {
    link.href = whatsappLink(link.dataset.whatsapp);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  if (localStorage.getItem("ouro-minas-age-ok") !== "yes") {
    ageGate.hidden = false;
    document.body.classList.add("locked");
  }

  acceptAge.addEventListener("click", function () {
    localStorage.setItem("ouro-minas-age-ok", "yes");
    ageGate.hidden = true;
    document.body.classList.remove("locked");
  });

  function quantityFor(card) {
    return Number(card.querySelector("output").textContent || "0");
  }

  function renderOrder() {
    const selected = productCards.filter(function (card) { return quantityFor(card) > 0; });
    const units = selected.reduce(function (sum, card) { return sum + quantityFor(card); }, 0);
    const total = selected.reduce(function (sum, card) {
      return sum + quantityFor(card) * Number(card.dataset.price);
    }, 0);

    orderSummary.textContent = units ? `${units} garrafa(s) selecionada(s)` : "Escolha as quantidades desejadas";
    orderTotal.textContent = units ? `Subtotal: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} • frete a calcular` : "Frete calculado após o CEP";
  }

  productCards.forEach(function (card) {
    card.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const output = card.querySelector("output");
      const current = quantityFor(card);
      output.textContent = String(button.dataset.action === "plus" ? Math.min(99, current + 1) : Math.max(0, current - 1));
      renderOrder();
    });
  });

  sendOrder.addEventListener("click", function () {
    const selected = productCards.filter(function (card) { return quantityFor(card) > 0; });
    const lines = selected.map(function (card) {
      const quantity = quantityFor(card);
      const subtotal = quantity * Number(card.dataset.price);
      return `• ${quantity}x ${card.dataset.product} — ${subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
    });
    const message = selected.length
      ? ["Olá, Igor! Gostaria de solicitar este pedido da Cachaça Ouro Minas:", ...lines, "Pode confirmar a disponibilidade e calcular o frete para o meu CEP?"].join("\n")
      : "Olá, Igor! Gostaria de conhecer os produtos e fazer um pedido da Cachaça Ouro Minas.";
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
  });
})();
